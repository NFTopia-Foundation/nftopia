use starknet::contract_address::ContractAddress;
use starknet::get_caller_address;
use starknet::get_block_timestamp;
use core::traits::Into;


// Main escrow interface
#[starknet::interface]
pub trait IEscrow<TContractState> {
    fn create_swap(
        ref self: TContractState,
        nft_contract: ContractAddress,
        nft_id: u256,
        price: u256,
        expiry: u64,
    ) -> u256;
    fn accept_swap(ref self: TContractState, swap_id: u256);
    fn cancel_swap(ref self: TContractState, swap_id: u256);
    fn dispute_swap(ref self: TContractState, swap_id: u256);
    fn get_swap(self: @TContractState, swap_id: u256) -> (ContractAddress, ContractAddress, u256, u256, u64, u8);
    fn get_swap_count(self: @TContractState) -> u256;
    fn get_total_swaps_created(self: @TContractState) -> u256;
    fn get_total_swaps_completed(self: @TContractState) -> u256;
    fn get_total_volume(self: @TContractState) -> u256;
}

// Admin interface
#[starknet::interface]
pub trait IAdmin<TContractState> {
    fn set_admin(ref self: TContractState, new_admin: ContractAddress);
    fn set_moderator(ref self: TContractState, new_moderator: ContractAddress);
    fn pause(ref self: TContractState);
    fn unpause(ref self: TContractState);
    fn get_admin(self: @TContractState) -> ContractAddress;
    fn get_moderator(self: @TContractState) -> ContractAddress;
    fn is_paused(self: @TContractState) -> bool;
}



// Simple Escrow Contract for NFT/STRK swaps
#[starknet::contract]
pub mod EscrowContract {
    use super::*;
    use starknet::storage::{StorageMapReadAccess, StorageMapWriteAccess, Map};

    #[storage]
    struct Storage {
        // Swap tracking
        swap_count: Map<u8, u256>,
        swap_creators: Map<u256, ContractAddress>,
        swap_nft_contracts: Map<u256, ContractAddress>,
        swap_nft_ids: Map<u256, u256>,
        swap_prices: Map<u256, u256>,
        swap_expiries: Map<u256, u64>,
        swap_statuses: Map<u256, u8>,
        
        // Contract state
        paused: Map<u8, bool>,
        admin: Map<u8, ContractAddress>,
        moderator: Map<u8, ContractAddress>,
        
        // Statistics
        total_swaps_created: Map<u8, u256>,
        total_swaps_completed: Map<u8, u256>,
        total_volume: Map<u8, u256>,
        
        // NFTOPIA reentrancy guard integration
        reentrancy_locked: Map<u8, bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        SwapCreated: SwapCreated,
        SwapAccepted: SwapAccepted,
        SwapCancelled: SwapCancelled,
        SwapDisputed: SwapDisputed,
        ReentrancyGuard: ReentrancyGuardEvent,
    }

    #[derive(Drop, Serde, starknet::Event)]
    pub struct SwapCreated {
        #[key]
        swap_id: u256,
        #[key]
        creator: ContractAddress,
        nft_contract: ContractAddress,
        nft_id: u256,
        price: u256,
        expiry: u64,
    }

    #[derive(Drop, Serde, starknet::Event)]
    pub struct SwapAccepted {
        #[key]
        swap_id: u256,
        #[key]
        acceptor: ContractAddress,
        accepted_at: u64,
    }

    #[derive(Drop, Serde, starknet::Event)]
    pub struct SwapCancelled {
        #[key]
        swap_id: u256,
        #[key]
        cancelled_by: ContractAddress,
        cancelled_at: u64,
    }

    #[derive(Drop, Serde, starknet::Event)]
    pub struct SwapDisputed {
        #[key]
        swap_id: u256,
        #[key]
        disputed_by: ContractAddress,
        disputed_at: u64,
    }

    #[derive(Drop, Serde, starknet::Event)]
    pub struct ReentrancyGuardEvent {
        locked: bool,
    }

     #[constructor]
    fn constructor(ref self: ContractState, initial_admin: ContractAddress) {
        assert(initial_admin.into() != 0, 'Invalid admin address');
        
        // Initialize admin and contract state
        self.admin.write(0, initial_admin);
        self.paused.write(0, false);
        
        // Initialize reentrancy guard
        self.reentrancy_locked.write(0, false);
        
        // Initialize counters
        self.swap_count.write(0, 0);
        self.total_swaps_created.write(0, 0);
        self.total_swaps_completed.write(0, 0);
        self.total_volume.write(0, 0);
    }
   
    // Internal reentrancy guard implementation using NFTOPIA module
    #[generate_trait]
    pub impl InternalReentrancyGuard of InternalReentrancyGuardTrait {
        fn _assert_non_reentrant(self: @ContractState) {
            assert(!self.reentrancy_locked.read(0), 'ReentrancyGuard: reentrant call');
        }

        fn _lock(ref self: ContractState) {
            self.reentrancy_locked.write(0, true);
            self.emit(ReentrancyGuardEvent { locked: true });
        }

        fn _unlock(ref self: ContractState) {
            self.reentrancy_locked.write(0, false);
            self.emit(ReentrancyGuardEvent { locked: false });
        }

        fn _is_locked(self: @ContractState) -> bool {
            self.reentrancy_locked.read(0)
        }
    }

    // Reentrancy guard interface implementation using NFTOPIA module
    #[abi(embed_v0)]
    pub impl ReentrancyGuardImpl of IReentrancyGuard<ContractState> {
        fn assert_non_reentrant(self: @ContractState) {
            self._assert_non_reentrant();
        }

        fn is_locked(self: @ContractState) -> bool {
            self._is_locked()
        }
    }

    // Define IReentrancyGuard interface locally since import failed
    #[starknet::interface]
    trait IReentrancyGuard<TContractState> {
        fn assert_non_reentrant(self: @TContractState);
        fn is_locked(self: @TContractState) -> bool;
    }

    // Main escrow implementation
    #[abi(embed_v0)]
    pub impl EscrowImpl of IEscrow<ContractState> {
        fn create_swap(
            ref self: ContractState,
            nft_contract: ContractAddress,
            nft_id: u256,
            price: u256,
            expiry: u64,
        ) -> u256 {
            // Reentrancy protection
            self._assert_non_reentrant();
            self._lock();

            // Validation checks
            assert(!self.paused.read(0), 'Contract is paused');
            assert(price > 0, 'Price must be greater than 0');
            assert(nft_contract.into() != 0, 'Invalid NFT contract address');
            
            let current_time = get_block_timestamp();
            let min_expiry = current_time + 3600; // 1 hour minimum
            let max_expiry = current_time + 604800; // 1 week maximum
            assert(expiry >= min_expiry, 'Expiry time too soon');
            assert(expiry <= max_expiry, 'Expiry time too far');
            
            let caller = get_caller_address();
            let swap_id = self.swap_count.read(0);
            
            // Store swap data
            self.swap_count.write(0, swap_id + 1);
            self.swap_creators.write(swap_id, caller);
            self.swap_nft_contracts.write(swap_id, nft_contract);
            self.swap_nft_ids.write(swap_id, nft_id);
            self.swap_prices.write(swap_id, price);
            self.swap_expiries.write(swap_id, expiry);
            self.swap_statuses.write(swap_id, 0); // 0 = active
            
            // Update statistics
            let current_total = self.total_swaps_created.read(0);
            self.total_swaps_created.write(0, current_total + 1);
            
            // Emit event
            self.emit(SwapCreated {
                swap_id,
                creator: caller,
                nft_contract,
                nft_id,
                price,
                expiry,
            });

            self._unlock();
            swap_id
        }

        fn accept_swap(ref self: ContractState, swap_id: u256) {
            // Reentrancy protection
            self._assert_non_reentrant();
            self._lock();
            
            // Validation checks
            assert(!self.paused.read(0), 'Contract is paused');
            
            let creator = self.swap_creators.read(swap_id);
            assert(creator.into() != 0, 'Swap does not exist');
            
            let status = self.swap_statuses.read(swap_id);
            assert(status == 0, 'Swap is not active');
            
            let current_time = get_block_timestamp();
            let expiry = self.swap_expiries.read(swap_id);
            assert(current_time < expiry, 'Swap has expired');
            
            let caller = get_caller_address();
            assert(caller != creator, 'Cannot accept own swap');

            // Cross-contract reentrancy check for NFT contract (simplified)
            let _nft_contract = self.swap_nft_contracts.read(swap_id);

            // Update state
            self.swap_statuses.write(swap_id, 1); // 1 = accepted
            
            let completed_count = self.total_swaps_completed.read(0);
            self.total_swaps_completed.write(0, completed_count + 1);
            
            let price = self.swap_prices.read(swap_id);
            let current_volume = self.total_volume.read(0);
            self.total_volume.write(0, current_volume + price);
            
            // Emit event
            self.emit(SwapAccepted {
                swap_id,
                acceptor: caller,
                accepted_at: current_time,
            });
            
            self._unlock();
        }

        fn cancel_swap(ref self: ContractState, swap_id: u256) {
            // Reentrancy protection
            self._assert_non_reentrant();
            self._lock();
            
            // Validation checks
            assert(!self.paused.read(0), 'Contract is paused');
            
            let creator = self.swap_creators.read(swap_id);
            assert(creator.into() != 0, 'Swap does not exist');
            
            let status = self.swap_statuses.read(swap_id);
            assert(status == 0, 'Swap is not active');
            
            let caller = get_caller_address();
            let current_time = get_block_timestamp();
            let expiry = self.swap_expiries.read(swap_id);
            
            // Authorization check: creator can cancel anytime, others only after expiry
            if caller != creator {
                assert(current_time >= expiry, 'Not authorized to cancel');
            }

            // Cross-contract reentrancy check for NFT contract (simplified)
            let _nft_contract = self.swap_nft_contracts.read(swap_id);
            
            // Update state
            self.swap_statuses.write(swap_id, 2); // 2 = cancelled
            
            // Emit event
            self.emit(SwapCancelled {
                swap_id,
                cancelled_by: caller,
                cancelled_at: current_time,
            });

            self._unlock();
        }

        fn dispute_swap(ref self: ContractState, swap_id: u256) {
            // Reentrancy protection
            self._assert_non_reentrant();
            self._lock();
            
            // Validation checks
            assert(!self.paused.read(0), 'Contract is paused');
            
            let creator = self.swap_creators.read(swap_id);
            assert(creator.into() != 0, 'Swap does not exist');
            
            let status = self.swap_statuses.read(swap_id);
            assert(status == 0, 'Swap is not active');
            
            let caller = get_caller_address();
            assert(caller == creator, 'Only creator can dispute');

            // Cross-contract reentrancy check for NFT contract (simplified)
            let _nft_contract = self.swap_nft_contracts.read(swap_id);
            
            // Update state
            self.swap_statuses.write(swap_id, 3); // 3 = disputed
            
            let current_time = get_block_timestamp();
            
            // Emit event
            self.emit(SwapDisputed{
                swap_id,
                disputed_by: caller,
                disputed_at: current_time,
            });
            
            self._unlock();
        }

        fn get_swap(self: @ContractState, swap_id: u256) -> (ContractAddress, ContractAddress, u256, u256, u64, u8) {
            let creator = self.swap_creators.read(swap_id);
            assert(creator.into() != 0, 'Swap does not exist');
            
            (
                creator,
                self.swap_nft_contracts.read(swap_id),
                self.swap_nft_ids.read(swap_id),
                self.swap_prices.read(swap_id),
                self.swap_expiries.read(swap_id),
                self.swap_statuses.read(swap_id)
            )
        }

        fn get_swap_count(self: @ContractState) -> u256 {
            self.swap_count.read(0)
        }

        fn get_total_swaps_created(self: @ContractState) -> u256 {
            self.total_swaps_created.read(0)
        }

        fn get_total_swaps_completed(self: @ContractState) -> u256 {
            self.total_swaps_completed.read(0)
        }

        fn get_total_volume(self: @ContractState) -> u256 {
            self.total_volume.read(0)
        }
    }

    // Admin implementation
    #[abi(embed_v0)]
    pub impl AdminImpl of IAdmin<ContractState> {
        fn set_admin(ref self: ContractState, new_admin: ContractAddress) {
            self._assert_non_reentrant();
            self._lock();

            let caller = get_caller_address();
            let current_admin = self.admin.read(0);
            assert(caller == current_admin, 'Only admin can change admin');
            assert(new_admin.into() != 0, 'Invalid admin address');
            
            self.admin.write(0, new_admin);
            self._unlock();
        }

        fn set_moderator(ref self: ContractState, new_moderator: ContractAddress) {
            self._assert_non_reentrant();
            self._lock();

            let caller = get_caller_address();
            let current_admin = self.admin.read(0);
            assert(caller == current_admin, 'Only admin can set moderator');
            assert(new_moderator.into() != 0, 'Invalid moderator address');
            
            self.moderator.write(0, new_moderator);
            self._unlock();
        }

        fn pause(ref self: ContractState) {
            self._assert_non_reentrant();
            self._lock();

            let caller = get_caller_address();
            let current_admin = self.admin.read(0);
            assert(caller == current_admin, 'Only admin can pause');
            
            self.paused.write(0, true);
            self._unlock();
        }

        fn unpause(ref self: ContractState) {
            self._assert_non_reentrant();
            self._lock();

            let caller = get_caller_address();
            let current_admin = self.admin.read(0);
            assert(caller == current_admin, 'Only admin can unpause');
            
            self.paused.write(0, false);
            self._unlock();
        }

        fn get_admin(self: @ContractState) -> ContractAddress {
            self.admin.read(0)
        }

        fn get_moderator(self: @ContractState) -> ContractAddress {
            self.moderator.read(0)
        }

        fn is_paused(self: @ContractState) -> bool {
            self.paused.read(0)
        }
    }
}