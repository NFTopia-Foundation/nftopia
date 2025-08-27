use starknet::ContractAddress;
use core::byte_array::ByteArray;

#[derive(Drop, Serde, starknet::Store)]
pub struct Checkpoint {
    from_timestamp: u64,
    votes: u256,
}

#[starknet::interface]
pub trait INftopiaToken<TContractState> {
    fn name(self: @TContractState) -> ByteArray;
    fn symbol(self: @TContractState) -> ByteArray;
    fn decimals(self: @TContractState) -> u8;
    fn total_supply(self: @TContractState) -> u256;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn allowance(self: @TContractState, owner: ContractAddress, spender: ContractAddress) -> u256;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(
        ref self: TContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: u256
    ) -> bool;
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;

    // Voting and delegation
    fn get_votes(self: @TContractState, account: ContractAddress) -> u256;
    fn get_past_votes(self: @TContractState, account: ContractAddress, timepoint: u64) -> u256;
    fn get_past_total_supply(self: @TContractState, timepoint: u64) -> u256;
    fn delegates(self: @TContractState, delegator: ContractAddress) -> ContractAddress;
    fn delegate(ref self: TContractState, delegatee: ContractAddress);
    fn delegate_by_sig(
        ref self: TContractState,
        delegator: ContractAddress,
        delegatee: ContractAddress,
        nonce: felt252,
        expiry: u64,
        signature: Array<felt252>
    );
    fn get_num_checkpoints(self: @TContractState, account: ContractAddress) -> u32;
    fn get_checkpoint(
        self: @TContractState,
        account: ContractAddress,
        checkpoint_id: u32
    ) -> Checkpoint;

    // Admin functions
    fn mint(ref self: TContractState, to: ContractAddress, amount: u256);
    fn burn(ref self: TContractState, from: ContractAddress, amount: u256);
}

#[starknet::contract]
pub mod NftopiaToken {
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use core::num::traits::zero::Zero;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess, StorageMapWriteAccess, Map};
    use super::Checkpoint;

    #[storage]
    struct Storage {
        name: ByteArray,
        symbol: ByteArray,
        decimals: u8,
        total_supply: u256,
        balances: Map<ContractAddress, u256>,
        allowances: Map<(ContractAddress, ContractAddress), u256>,
        
        // Voting power tracking
        delegates: Map<ContractAddress, ContractAddress>, // user => delegate
        checkpoints: Map<(ContractAddress, u32), Checkpoint>, // (user, checkpoint_id) => Checkpoint
        num_checkpoints: Map<ContractAddress, u32>, // user => number of checkpoints
        total_supply_checkpoints: Map<u32, Checkpoint>, // checkpoint_id => Checkpoint
        num_total_supply_checkpoints: u32,
        
        // Admin
        owner: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Transfer: Transfer,
        Approval: Approval,
        DelegateChanged: DelegateChanged,
        DelegateVotesChanged: DelegateVotesChanged,
    }

    #[derive(Drop, starknet::Event)]
    struct DelegateChanged {
        delegator: ContractAddress,
        from_delegate: ContractAddress,
        to_delegate: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct DelegateVotesChanged {
        delegate: ContractAddress,
        previous_balance: u256,
        new_balance: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Transfer {
        from: ContractAddress,
        to: ContractAddress,
        value: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Approval {
        owner: ContractAddress,
        spender: ContractAddress,
        value: u256,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        name: ByteArray,
        symbol: ByteArray,
        initial_supply: u256,
        owner: ContractAddress
    ) {
        self.name.write(name);
        self.symbol.write(symbol);
        self.decimals.write(18);
        self.total_supply.write(initial_supply);
        self.balances.write(owner, initial_supply);
        self.owner.write(owner);

        self.emit(Transfer { from: Zero::zero(), to: owner, value: initial_supply });
    }

    #[abi(embed_v0)]
    impl NftopiaTokenImpl of super::INftopiaToken<ContractState> {
        fn name(self: @ContractState) -> ByteArray {
            self.name.read()
        }

        fn symbol(self: @ContractState) -> ByteArray {
            self.symbol.read()
        }

        fn decimals(self: @ContractState) -> u8 {
            self.decimals.read()
        }

        fn total_supply(self: @ContractState) -> u256 {
            self.total_supply.read()
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }

        fn allowance(
            self: @ContractState, owner: ContractAddress, spender: ContractAddress
        ) -> u256 {
            self.allowances.read((owner, spender))
        }

        fn transfer(ref self: ContractState, recipient: ContractAddress, amount: u256) -> bool {
            let sender = get_caller_address();
            self._transfer(sender, recipient, amount);
            true
        }

        fn transfer_from(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256
        ) -> bool {
            let caller = get_caller_address();
            let current_allowance = self.allowances.read((sender, caller));
            
            assert(current_allowance >= amount, 'Insufficient allowance');
            
            self._approve(sender, caller, current_allowance - amount);
            self._transfer(sender, recipient, amount);
            true
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            let owner = get_caller_address();
            self._approve(owner, spender, amount);
            true
        }

        // Simplified voting - just return current balance
        fn get_votes(self: @ContractState, account: ContractAddress) -> u256 {
            self._get_current_votes(account)
        }

        fn get_past_votes(
            self: @ContractState, account: ContractAddress, timepoint: u64
        ) -> u256 {
            self._get_checkpoint_at_timestamp(account, timepoint)
        }

        fn get_past_total_supply(self: @ContractState, timepoint: u64) -> u256 {
            let num_points = self.num_total_supply_checkpoints.read();
            if num_points == 0 {
                return 0;
            }

            // Binary search for checkpoint
            let mut low: u32 = 0;
            let mut high: u32 = num_points - 1;

            while low < high {
                let mid = (low + high + 1) / 2;
                let checkpoint = self.total_supply_checkpoints.read(mid);
                
                if checkpoint.from_timestamp <= timepoint {
                    low = mid;
                } else {
                    high = mid - 1;
                }
            };

            self.total_supply_checkpoints.read(low).votes
        }

        fn delegates(self: @ContractState, delegator: ContractAddress) -> ContractAddress {
            self.delegates.read(delegator)
        }

        fn delegate(ref self: ContractState, delegatee: ContractAddress) {
            let delegator = get_caller_address();
            self._delegate(delegator, delegatee);
        }

        fn delegate_by_sig(
            ref self: ContractState,
            delegator: ContractAddress,
            delegatee: ContractAddress,
            nonce: felt252,
            expiry: u64,
            signature: Array<felt252>
        ) {
            // TODO: Implement signature verification
            let current_time = starknet::get_block_timestamp();
            assert(current_time <= expiry, 'Signature expired');
            
            self._delegate(delegator, delegatee);
        }

        fn get_num_checkpoints(self: @ContractState, account: ContractAddress) -> u32 {
            self.num_checkpoints.read(account)
        }

        fn get_checkpoint(
            self: @ContractState,
            account: ContractAddress,
            checkpoint_id: u32
        ) -> Checkpoint {
            assert(checkpoint_id < self.num_checkpoints.read(account), 'Invalid checkpoint ID');
            self.checkpoints.read((account, checkpoint_id))
        }

        fn mint(ref self: ContractState, to: ContractAddress, amount: u256) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can mint');
            self._mint(to, amount);
        }

        fn burn(ref self: ContractState, from: ContractAddress, amount: u256) {
            let caller = get_caller_address();
            assert(caller == self.owner.read(), 'Only owner can burn');
            self._burn(from, amount);
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _delegate(ref self: ContractState, delegator: ContractAddress, delegatee: ContractAddress) {
            let current_delegate = self.delegates.read(delegator);
            if current_delegate == delegatee {
                return;
            }

            let delegator_balance = self.balances.read(delegator);
            
            // Update delegate
            self.delegates.write(delegator, delegatee);
            
            // Emit event
            self.emit(DelegateChanged {
                delegator,
                from_delegate: current_delegate,
                to_delegate: delegatee,
            });

            // Move voting power
            if !current_delegate.is_zero() {
                self._move_voting_power(current_delegate, delegatee, delegator_balance);
            }
            if !delegatee.is_zero() {
                self._move_voting_power(Zero::zero(), delegatee, delegator_balance);
            }
        }

        fn _move_voting_power(
            ref self: ContractState,
            src: ContractAddress,
            dst: ContractAddress,
            amount: u256
        ) {
            if src == dst || amount == 0 {
                return;
            }

            if !src.is_zero() {
                let src_old_weight = self._get_current_votes(src);
                let src_new_weight = src_old_weight - amount;
                self._write_checkpoint(src, src_new_weight);
            }

            if !dst.is_zero() {
                let dst_old_weight = self._get_current_votes(dst);
                let dst_new_weight = dst_old_weight + amount;
                self._write_checkpoint(dst, dst_new_weight);
            }
        }

        fn _write_checkpoint(ref self: ContractState, delegatee: ContractAddress, new_weight: u256) {
            let timestamp = starknet::get_block_timestamp();
            let pos = self.num_checkpoints.read(delegatee);
            let old_weight = if pos > 0 {
                self.checkpoints.read((delegatee, pos - 1)).votes
            } else {
                0
            };

            if pos > 0 && self.checkpoints.read((delegatee, pos - 1)).from_timestamp == timestamp {
                self.checkpoints.write(
                    (delegatee, pos - 1),
                    Checkpoint { from_timestamp: timestamp, votes: new_weight }
                );
            } else {
                self.checkpoints.write(
                    (delegatee, pos),
                    Checkpoint { from_timestamp: timestamp, votes: new_weight }
                );
                self.num_checkpoints.write(delegatee, pos + 1);
            }

            self.emit(DelegateVotesChanged {
                delegate: delegatee,
                previous_balance: old_weight,
                new_balance: new_weight,
            });
        }

        fn _write_total_supply_checkpoint(ref self: ContractState, new_total_supply: u256) {
            let timestamp = starknet::get_block_timestamp();
            let pos = self.num_total_supply_checkpoints.read();
            
            if pos > 0 && self.total_supply_checkpoints.read(pos - 1).from_timestamp == timestamp {
                self.total_supply_checkpoints.write(
                    pos - 1,
                    Checkpoint { from_timestamp: timestamp, votes: new_total_supply }
                );
            } else {
                self.total_supply_checkpoints.write(
                    pos,
                    Checkpoint { from_timestamp: timestamp, votes: new_total_supply }
                );
                self.num_total_supply_checkpoints.write(pos + 1);
            }
        }

        fn _get_current_votes(self: @ContractState, account: ContractAddress) -> u256 {
            let pos = self.num_checkpoints.read(account);
            if pos == 0 {
                return 0;
            }
            self.checkpoints.read((account, pos - 1)).votes
        }

        fn _get_checkpoint_at_timestamp(
            self: @ContractState,
            account: ContractAddress,
            timestamp: u64
        ) -> u256 {
            let num_points = self.num_checkpoints.read(account);
            if num_points == 0 {
                return 0;
            }

            // Binary search for checkpoint
            let mut low: u32 = 0;
            let mut high: u32 = num_points - 1;

            while low < high {
                let mid = (low + high + 1) / 2;
                let checkpoint = self.checkpoints.read((account, mid));
                
                if checkpoint.from_timestamp <= timestamp {
                    low = mid;
                } else {
                    high = mid - 1;
                }
            };

            self.checkpoints.read((account, low)).votes
        }
        fn _transfer(
            ref self: ContractState,
            sender: ContractAddress,
            recipient: ContractAddress,
            amount: u256
        ) {
            assert(!sender.is_zero(), 'Transfer from zero address');
            assert(!recipient.is_zero(), 'Transfer to zero address');

            let sender_balance = self.balances.read(sender);
            assert(sender_balance >= amount, 'Insufficient balance');

            // Update balances
            self.balances.write(sender, sender_balance - amount);
            let recipient_balance = self.balances.read(recipient);
            self.balances.write(recipient, recipient_balance + amount);

            // Move voting power if delegated
            let sender_delegate = self.delegates.read(sender);
            if !sender_delegate.is_zero() {
                self._move_voting_power(sender_delegate, Zero::zero(), amount);
            }

            let recipient_delegate = self.delegates.read(recipient);
            if !recipient_delegate.is_zero() {
                self._move_voting_power(Zero::zero(), recipient_delegate, amount);
            }

            self.emit(Transfer { from: sender, to: recipient, value: amount });
        }

        fn _approve(
            ref self: ContractState,
            owner: ContractAddress,
            spender: ContractAddress,
            amount: u256
        ) {
            assert(!owner.is_zero(), 'Approve from zero address');
            assert(!spender.is_zero(), 'Approve to zero address');

            self.allowances.write((owner, spender), amount);
            self.emit(Approval { owner: owner, spender: spender, value: amount });
        }

        fn _mint(ref self: ContractState, to: ContractAddress, amount: u256) {
            assert(!to.is_zero(), 'Mint to zero address');

            let current_supply = self.total_supply.read();
            self.total_supply.write(current_supply + amount);
            
            let balance = self.balances.read(to);
            self.balances.write(to, balance + amount);

            self.emit(Transfer { from: Zero::zero(), to: to, value: amount });
        }

        fn _burn(ref self: ContractState, from: ContractAddress, amount: u256) {
            assert(!from.is_zero(), 'Burn from zero address');

            let balance = self.balances.read(from);
            assert(balance >= amount, 'Insufficient balance');

            self.balances.write(from, balance - amount);
            
            let current_supply = self.total_supply.read();
            self.total_supply.write(current_supply - amount);

            self.emit(Transfer { from: from, to: Zero::zero(), value: amount });
        }
    }
}