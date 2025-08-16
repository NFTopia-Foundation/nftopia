use starknet::ContractAddress;

#[derive(Drop, Serde, Copy, starknet::Store)]
pub struct WithdrawalRequest {
    pub id: u256,
    pub beneficiary: ContractAddress,
    pub amount: u256,
    pub description_hash: felt252,
    pub created_at: u64,
    pub approved_count: u32,
    pub executed: bool,
    pub cancelled: bool,
}

#[starknet::interface]
pub trait IDaoTreasury<TContractState> {
    fn get_balance(self: @TContractState) -> u256;
    fn get_withdrawal_request(self: @TContractState, request_id: u256) -> WithdrawalRequest;
    fn get_required_approvals(self: @TContractState) -> u32;
    fn is_authorized_signer(self: @TContractState, signer: ContractAddress) -> bool;
    fn get_withdrawal_limit(self: @TContractState) -> u256;
    fn get_request_count(self: @TContractState) -> u256;
    fn has_approved(self: @TContractState, request_id: u256, signer: ContractAddress) -> bool;
    fn deposit(ref self: TContractState, amount: u256);
    fn request_withdrawal(
        ref self: TContractState,
        beneficiary: ContractAddress,
        amount: u256,
        description_hash: felt252
    ) -> u256;
    fn approve_withdrawal(ref self: TContractState, request_id: u256);
    fn execute_withdrawal(ref self: TContractState, request_id: u256);
    fn cancel_withdrawal(ref self: TContractState, request_id: u256);

    // Admin functions
    fn add_authorized_signer(ref self: TContractState, signer: ContractAddress);
    fn remove_authorized_signer(ref self: TContractState, signer: ContractAddress);
    fn set_required_approvals(ref self: TContractState, required: u32);
    fn set_withdrawal_limit(ref self: TContractState, limit: u256);
}

#[starknet::contract]
pub mod DaoTreasury {
    use super::WithdrawalRequest;
    use starknet::ContractAddress;
    use starknet::{get_caller_address, get_block_timestamp};
    use core::num::traits::zero::Zero;
    use starknet::storage::{
        StorageMapReadAccess, StorageMapWriteAccess, Map, 
        StoragePointerReadAccess, StoragePointerWriteAccess
    };

    #[storage]
    struct Storage {
        // Treasury balance
        balance: u256,
        
        // Withdrawal requests
        request_counter: u256,
        withdrawal_requests: Map<u256, WithdrawalRequest>,
        
        // Multi-sig configuration
        required_approvals: u32,
        authorized_signers: Map<ContractAddress, bool>,
        
        // Approvals: (request_id, signer) => bool
        approvals: Map<(u256, ContractAddress), bool>,
        
        // Withdrawal limit
        withdrawal_limit: u256,
        
        // Admin
        admin: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Deposit: Deposit,
        WithdrawalRequested: WithdrawalRequested,
        WithdrawalApproved: WithdrawalApproved,
        WithdrawalExecuted: WithdrawalExecuted,
        WithdrawalCancelled: WithdrawalCancelled,
        SignerAdded: SignerAdded,
        SignerRemoved: SignerRemoved,
    }

    #[derive(Drop, starknet::Event)]
    struct Deposit {
        depositor: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct WithdrawalRequested {
        request_id: u256,
        beneficiary: ContractAddress,
        amount: u256,
        requester: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct WithdrawalApproved {
        request_id: u256,
        approver: ContractAddress,
        total_approvals: u32,
    }

    #[derive(Drop, starknet::Event)]
    struct WithdrawalExecuted {
        request_id: u256,
        beneficiary: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct WithdrawalCancelled {
        request_id: u256,
        canceller: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct SignerAdded {
        signer: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct SignerRemoved {
        signer: ContractAddress,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        admin: ContractAddress,
        initial_signers: Span<ContractAddress>,
        required_approvals: u32,
        withdrawal_limit: u256
    ) {
        self.admin.write(admin);
        self.required_approvals.write(required_approvals);
        self.withdrawal_limit.write(withdrawal_limit);
        self.request_counter.write(0);
        self.balance.write(0);
        
        let mut i = 0;
        loop {
            if i >= initial_signers.len() {
                break;
            }
            self.authorized_signers.write(*initial_signers.at(i), true);
            i += 1;
        };
    }

    #[abi(embed_v0)]
    impl DaoTreasuryImpl of super::IDaoTreasury<ContractState> {
        fn get_balance(self: @ContractState) -> u256 {
            self.balance.read()
        }

        fn get_withdrawal_request(self: @ContractState, request_id: u256) -> WithdrawalRequest {
            self.withdrawal_requests.read(request_id)
        }

        fn get_required_approvals(self: @ContractState) -> u32 {
            self.required_approvals.read()
        }

        fn is_authorized_signer(self: @ContractState, signer: ContractAddress) -> bool {
            self.authorized_signers.read(signer)
        }

        fn get_withdrawal_limit(self: @ContractState) -> u256 {
            self.withdrawal_limit.read()
        }

        fn get_request_count(self: @ContractState) -> u256 {
            self.request_counter.read()
        }

        fn has_approved(self: @ContractState, request_id: u256, signer: ContractAddress) -> bool {
            self.approvals.read((request_id, signer))
        }

        fn deposit(ref self: ContractState, amount: u256) {
            assert!(amount > 0, "Amount must be positive");
            
            let current_balance = self.balance.read();
            self.balance.write(current_balance + amount);

            self.emit(Deposit {
                depositor: get_caller_address(),
                amount,
            });
        }

        fn request_withdrawal(
            ref self: ContractState,
            beneficiary: ContractAddress,
            amount: u256,
            description_hash: felt252
        ) -> u256 {
            assert!(!beneficiary.is_zero(), "Invalid beneficiary");
            assert!(amount > 0, "Amount must be positive");
            assert!(amount <= self.withdrawal_limit.read(), "Exceeds withdrawal limit");
            assert!(self.balance.read() >= amount, "Insufficient balance");

            let request_id = self.request_counter.read() + 1;
            self.request_counter.write(request_id);

            let request = WithdrawalRequest {
                id: request_id,
                beneficiary,
                amount,
                description_hash,
                created_at: get_block_timestamp(),
                approved_count: 0,
                executed: false,
                cancelled: false,
            };

            self.withdrawal_requests.write(request_id, request);

            self.emit(WithdrawalRequested {
                request_id,
                beneficiary,
                amount,
                requester: get_caller_address(),
            });

            request_id
        }

        fn approve_withdrawal(ref self: ContractState, request_id: u256) {
            let approver = get_caller_address();
            
            // Check if approver is authorized
            assert!(self.authorized_signers.read(approver), "Not authorized signer");
            
            // Check if request exists and is not executed/cancelled
            let mut request = self.withdrawal_requests.read(request_id);
            assert!(request.id != 0, "Request does not exist");
            assert!(!request.executed, "Request already executed");
            assert!(!request.cancelled, "Request cancelled");
            
            assert!(!self.approvals.read((request_id, approver)), "Already approved");
            
            self.approvals.write((request_id, approver), true);
            
            // Update request with new approval count
            let mut updated_request = request;
            updated_request.approved_count += 1;
            self.withdrawal_requests.write(request_id, updated_request);

            self.emit(WithdrawalApproved {
                request_id,
                approver,
                total_approvals: updated_request.approved_count,
            });
        }

        fn execute_withdrawal(ref self: ContractState, request_id: u256) {
            let mut request = self.withdrawal_requests.read(request_id);
            
            assert!(request.id != 0, "Request does not exist");
            assert!(!request.executed, "Request already executed");
            assert!(!request.cancelled, "Request cancelled");
            assert!(request.approved_count >= self.required_approvals.read(), "Insufficient approvals");
            
            let current_balance = self.balance.read();
            assert!(current_balance >= request.amount, "Insufficient balance");
            
            let mut updated_request = request;
            updated_request.executed = true;
            self.withdrawal_requests.write(request_id, updated_request);
            self.balance.write(current_balance - updated_request.amount);

            self.emit(WithdrawalExecuted {
                request_id,
                beneficiary: updated_request.beneficiary,
                amount: updated_request.amount,
            });
        }

        fn cancel_withdrawal(ref self: ContractState, request_id: u256) {
            let caller = get_caller_address();
            let mut request = self.withdrawal_requests.read(request_id);
            
            // Check if caller can cancel (admin only)
            assert!(caller == self.admin.read(), "Only admin can cancel withdrawal");
            
            assert!(request.id != 0, "Request does not exist");
            assert!(!request.executed, "Request already executed");
            assert!(!request.cancelled, "Request already cancelled");
            
            request.cancelled = true;
            self.withdrawal_requests.write(request_id, request);

            self.emit(WithdrawalCancelled {
                request_id,
                canceller: caller,
            });
        }

        fn add_authorized_signer(ref self: ContractState, signer: ContractAddress) {
            assert!(get_caller_address() == self.admin.read(), "Only admin can add signer");
            assert!(!signer.is_zero(), "Invalid signer");
            
            self.authorized_signers.write(signer, true);
            
            self.emit(SignerAdded { signer });
        }

        fn remove_authorized_signer(ref self: ContractState, signer: ContractAddress) {
            assert!(get_caller_address() == self.admin.read(), "Only admin can remove signer");
            
            self.authorized_signers.write(signer, false);
            
            self.emit(SignerRemoved { signer });
        }

        fn set_required_approvals(ref self: ContractState, required: u32) {
            assert!(get_caller_address() == self.admin.read(), "Only admin can set required approvals");
            assert!(required > 0, "Invalid approvals");
            
            self.required_approvals.write(required);
        }

        fn set_withdrawal_limit(ref self: ContractState, limit: u256) {
            assert!(get_caller_address() == self.admin.read(), "Only admin can set withdrawal limit");
            
            self.withdrawal_limit.write(limit);
        }
    }
}
