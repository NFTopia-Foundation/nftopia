use starknet::contract_address::ContractAddress;
use starknet::get_caller_address;
use starknet::get_block_timestamp;
// use starknet::storage::{StorageMapReadAccess, StorageMapWriteAccess};

use core::traits::Into;
// use crate::modules::reentrancy_guard::ReentrancyGuard;

// Simple Escrow Contract for NFT/STRK swaps
#[starknet::contract]
// #[feature("deprecated_legacy_map")]
mod EscrowContract {
    use super::*;
    use crate::modules::reentrancy_guard::ReentrancyGuard;
    use crate::interfaces::reentrancy_interfaces::IReentrancyGuardTrait;
    use starknet::storage::{StorageMapReadAccess, StorageMapWriteAccess, Map};


    #[storage]
    struct Storage {
    // Existing swap tracking
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
        
        // Add reentrancy guard substorage
        reentrancy_guard: ReentrancyGuard::Storage,
}

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        SwapCreated: SwapCreated,
        SwapAccepted: SwapAccepted,
        SwapCancelled: SwapCancelled,
        SwapDisputed: SwapDisputed,
    }

    #[derive(Drop, starknet::Event)]
    struct SwapCreated {
        swap_id: u256,
        creator: ContractAddress,
        nft_contract: ContractAddress,
        nft_id: u256,
        price: u256,
        expiry: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct SwapAccepted {
        swap_id: u256,
        acceptor: ContractAddress,
        accepted_at: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct SwapCancelled {
        swap_id: u256,
        cancelled_by: ContractAddress,
        cancelled_at: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct SwapDisputed {
        swap_id: u256,
        disputed_by: ContractAddress,
        disputed_at: u64,
    }

    #[starknet::interface]
    trait IEscrow<TContractState> {
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

    #[abi(embed_v0)]
    impl EscrowImpl of IEscrow<ContractState> {

        #[modifier(ReentrancyGuard::non_reentrant())]
        fn create_swap(
            ref self: ContractState,
            nft_contract: ContractAddress,
            nft_id: u256,
            price: u256,
            expiry: u64,
        ) -> u256 {
            
            
            self.reentrancy_guard._assert_non_reentrant();
            self.reentrancy_guard._lock();


            assert(!self.paused.read(0), 'Paused');
            assert(price > 0, 'Invalid price');
            assert(nft_contract.into() != 0, 'Invalid NFT contract');
            let now = get_block_timestamp();
            let min_expiry = now + 3600;
            let max_expiry = now + 604800;
            assert(expiry >= min_expiry, 'Expiry too soon');
            assert(expiry <= max_expiry, 'Expiry too far');
            let caller = get_caller_address();
            let swap_id = self.swap_count.read(0);
            self.swap_count.write(0, swap_id + 1);
            self.swap_creators.write(swap_id, caller);
            self.swap_nft_contracts.write(swap_id, nft_contract);
            self.swap_nft_ids.write(swap_id, nft_id);
            self.swap_prices.write(swap_id, price);
            self.swap_expiries.write(swap_id, expiry);
            self.swap_statuses.write(swap_id, 0);
            self.total_swaps_created.write(0, self.total_swaps_created.read(0) + 1);
            self.emit(Event::SwapCreated(SwapCreated {
                swap_id,
                creator: caller,
                nft_contract,
                nft_id,
                price,
                expiry,
            }));

            self.reentrancy_guard._unlock();

            swap_id;
        }

        #[modifier(ReentrancyGuard::non_reentrant())]
        fn accept_swap(ref self: ContractState, swap_id: u256) {
            self.reentrancy_guard._assert_non_reentrant();
            self.reentrancy_guard._lock();
            
            // Original checks
            assert(!self.paused.read(0), 'Paused');
            let creator = self.swap_creators.read(swap_id);
            assert(creator.into() != 0, 'Swap not found');
            
            // Cross-contract reentrancy check
            let nft_contract = self.swap_nft_contracts.read(swap_id);
            let guard_check = IReentrancyGuardDispatcher { contract_address: nft_contract };
            guard_check.assert_non_reentrant();

            let status = self.swap_statuses.read(swap_id);
            assert(status == 0, 'Not active');
            let now = get_block_timestamp();
            let expiry = self.swap_expiries.read(swap_id);
            assert(now < expiry, 'Expired');
            let caller = get_caller_address();
            assert(caller != creator, 'Cannot accept own swap');

            // State changes
            self.swap_statuses.write(swap_id, 1);
            self.total_swaps_completed.write(0, self.total_swaps_completed.read(0) + 1);
            let price = self.swap_prices.read(swap_id);
            self.total_volume.write(0, self.total_volume.read(0) + price);
            
            self.emit(Event::SwapAccepted(SwapAccepted {
                swap_id,
                acceptor: caller,
                accepted_at: now,
            }));
            
            self.reentrancy_guard._unlock();
        }

        #[modifier(ReentrancyGuard::non_reentrant())]
        fn cancel_swap(ref self: ContractState, swap_id: u256) {

            self.reentrancy_guard._assert_non_reentrant();
            self.reentrancy_guard._lock();
            
            assert(!self.paused.read(0), 'Paused');
            let creator = self.swap_creators.read(swap_id);
            assert(creator.into() != 0, 'Swap not found');
            
            let nft_contract = self.swap_nft_contracts.read(swap_id);
            let guard_check = IReentrancyGuardDispatcher { contract_address: nft_contract };
            guard_check.assert_non_reentrant();

            let status = self.swap_statuses.read(swap_id);
            assert(status == 0, 'Not active');
            let caller = get_caller_address();
            let now = get_block_timestamp();
            let expiry = self.swap_expiries.read(swap_id);
            if caller != creator {
                assert(now >= expiry, 'Not authorized');
            }
            
            self.swap_statuses.write(swap_id, 2);
            
            self.emit(Event::SwapCancelled(SwapCancelled {
                swap_id,
                cancelled_by: caller,
                cancelled_at: now,
            }));

            self.reentrancy_guard._unlock();
        }

        #[modifier(ReentrancyGuard::non_reentrant())]
        fn dispute_swap(ref self: ContractState, swap_id: u256) {


            self.reentrancy_guard._assert_non_reentrant();
            self.reentrancy_guard._lock();

            
            assert(!self.paused.read(0), 'Paused');
            let creator = self.swap_creators.read(swap_id);
            assert(creator.into() != 0, 'Swap not found');
            
            
            let nft_contract = self.swap_nft_contracts.read(swap_id);
            let guard_check = IReentrancyGuardDispatcher { contract_address: nft_contract };
            guard_check.assert_non_reentrant();

            let status = self.swap_statuses.read(swap_id);
            assert(status == 0, 'Not active');
            let caller = get_caller_address();
            assert(caller == creator, 'Only creator can dispute');
            
            self.swap_statuses.write(swap_id, 3);
            
            
            self.emit(Event::SwapDisputed(SwapDisputed {
                swap_id,
                disputed_by: caller,
                disputed_at: get_block_timestamp(),
            }));
            
            self.reentrancy_guard._unlock();
        }
        fn get_swap(self: @ContractState, swap_id: u256) -> (ContractAddress, ContractAddress, u256, u256, u64, u8) {
            let creator = self.swap_creators.read(swap_id);
            assert(creator.into() != 0, 'Swap not found');
            let nft_contract = self.swap_nft_contracts.read(swap_id);
            let nft_id = self.swap_nft_ids.read(swap_id);
            let price = self.swap_prices.read(swap_id);
            let expiry = self.swap_expiries.read(swap_id);
            let status = self.swap_statuses.read(swap_id);
            (creator, nft_contract, nft_id, price, expiry, status)
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

    // Admin functions
    #[abi(embed_v0)]
    impl AdminImpl of AdminTrait<ContractState> {

        #[modifier(ReentrancyGuard::non_reentrant())]
        fn set_admin(ref self: ContractState, new_admin: ContractAddress) {

            self.reentrancy_guard._assert_non_reentrant();

            let caller = get_caller_address();
            let admin = self.admin.read(0);
            assert(caller == admin, 'Only admin can change admin');
            
            self.admin.write(0, new_admin);
        }

        #[modifier(ReentrancyGuard::non_reentrant())]
        fn set_moderator(ref self: ContractState, new_moderator: ContractAddress) {

            self.reentrancy_guard._assert_non_reentrant();

            let caller = get_caller_address();
            let admin = self.admin.read(0);
            assert(caller == admin, 'Only admin can change moderator');
            
            self.moderator.write(0, new_moderator);
        }

        #[modifier(ReentrancyGuard::non_reentrant())]
        fn pause(ref self: ContractState) {

            self.reentrancy_guard._assert_non_reentrant();

            let caller = get_caller_address();
            let admin = self.admin.read(0);
            assert(caller == admin, 'Only admin can pause');
            
            self.paused.write(0, true);
        }


        #[modifier(ReentrancyGuard::non_reentrant())]
        fn unpause(ref self: ContractState) {

            self.reentrancy_guard._assert_non_reentrant();

            let caller = get_caller_address();
            let admin = self.admin.read(0);
            assert(caller == admin, 'Only admin can unpause');
            
            self.paused.write(0, false);
        }
    }

    // Admin trait
    #[starknet::interface]
    trait AdminTrait<TContractState> {
        fn set_admin(ref self: TContractState, new_admin: ContractAddress);
        fn set_moderator(ref self: TContractState, new_moderator: ContractAddress);
        fn pause(ref self: TContractState);
        fn unpause(ref self: TContractState);
    }
} 
