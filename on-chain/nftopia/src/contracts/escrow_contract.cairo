use starknet::contract_address::ContractAddress;
use starknet::get_caller_address;
use starknet::get_block_timestamp;
use starknet::info::get_contract_address;

use crate::storage::escrow_storage::EscrowStorage::storage::StorageState;
use crate::storage::escrow_storage::EscrowStorage::storage::StorageAddressTrait;
use crate::storage::escrow_storage::EscrowStorage::event::EventTrait;
use crate::storage::escrow_storage::EscrowStorage::event::Event;
use crate::storage::escrow_storage::Swap;
use crate::storage::escrow_storage::SwapStatus;

use crate::interfaces::escrow_interfaces::ISRC721Dispatcher;
use crate::interfaces::escrow_interfaces::ISRC721DispatcherTrait;
use crate::interfaces::escrow_interfaces::ISRC20Dispatcher;
use crate::interfaces::escrow_interfaces::ISRC20DispatcherTrait;

// Swap status enum
#[derive(Drop, starknet::Store, Copy)]
enum SwapStatus {
    Created,
    Completed,
    Cancelled,
    Disputed,
}

// Main Escrow Contract
#[starknet::contract]
mod EscrowContract {
    use super::*;

    #[storage]
    struct Storage {
        // Swap tracking - using individual variables instead of struct
        swap_creators: LegacyMap<u256, ContractAddress>,
        swap_nft_contracts: LegacyMap<u256, ContractAddress>,
        swap_nft_ids: LegacyMap<u256, u256>,
        swap_prices: LegacyMap<u256, u256>,
        swap_expiries: LegacyMap<u256, u64>,
        swap_statuses: LegacyMap<u256, SwapStatus>,
        swap_created_ats: LegacyMap<u256, u64>,
        swap_accepted_ats: LegacyMap<u256, Option<u64>>,
        swap_cancelled_ats: LegacyMap<u256, Option<u64>>,
        swap_disputed_ats: LegacyMap<u256, Option<u64>>,
        swap_dispute_resolved_ats: LegacyMap<u256, Option<u64>>,
        swap_dispute_winners: LegacyMap<u256, Option<ContractAddress>>,
        
        next_swap_id: u256,
        
        // User data
        user_swaps: LegacyMap<ContractAddress, Array<u256>>,
        active_swaps: Array<u256>,
        
        // Contract state
        paused: bool,
        admin: ContractAddress,
        moderator: ContractAddress,
        dispute_period: u64,
        max_swaps_per_user: u32,
        
        // Reentrancy protection
        locked: bool,
        
        // Circuit breaker
        emergency_stop: bool,
        
        // Rate limiting
        user_swap_count: LegacyMap<ContractAddress, u32>,
        last_swap_time: LegacyMap<ContractAddress, u64>,
        
        // Fees and economics
        platform_fee: u256,
        platform_fee_recipient: ContractAddress,
        
        // Statistics
        total_swaps_created: u256,
        total_swaps_completed: u256,
        total_volume: u256,
        
        // STRK token contract address
        strk_contract: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        SwapCreated: SwapCreated,
        SwapAccepted: SwapAccepted,
        SwapCancelled: SwapCancelled,
        SwapDisputed: SwapDisputed,
        DisputeResolved: DisputeResolved,
        EmergencyStop: EmergencyStop,
        AdminChanged: AdminChanged,
        ModeratorChanged: ModeratorChanged,
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

    #[derive(Drop, starknet::Event)]
    struct DisputeResolved {
        swap_id: u256,
        winner: ContractAddress,
        resolved_at: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct EmergencyStop {
        stopped_by: ContractAddress,
        stopped_at: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct AdminChanged {
        old_admin: ContractAddress,
        new_admin: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct ModeratorChanged {
        old_moderator: ContractAddress,
        new_moderator: ContractAddress,
    }

    #[external(v0)]
    impl EscrowContractImpl of super::IEscrow<ContractState> {
        fn create_swap(
            ref self: ContractState,
            nft_contract: ContractAddress,
            nft_id: u256,
            price: u256,
            expiry: u64,
        ) -> u256 {
            // Check contract state
            assert(!self.paused.read(), 'Contract is paused');
            assert(!self.emergency_stop.read(), 'Emergency stop active');
            
            // Validate inputs
            assert(price > 0, 'Invalid price');
            assert(nft_contract != ContractAddress::default(), 'Invalid NFT contract');
            
            let current_time = get_block_timestamp();
            let min_expiry = current_time + 3600; // 1 hour minimum
            let max_expiry = current_time + 604800; // 7 days maximum
            assert(expiry >= min_expiry, 'Expiry too soon');
            assert(expiry <= max_expiry, 'Expiry too far');
            
            let caller = get_caller_address();
            
            // Check user swap limit
            let user_swaps = self.user_swap_count.read(caller);
            assert(user_swaps < 10, 'Too many active swaps');
            
            // Verify NFT ownership and approval
            let nft_dispatcher = ISRC721Dispatcher { contract_address: nft_contract };
            let owner = nft_dispatcher.owner_of(nft_id);
            assert(owner == caller, 'Not NFT owner');
            
            let approved = nft_dispatcher.get_approved(nft_id);
            let is_approved_for_all = nft_dispatcher.is_approved_for_all(caller, get_contract_address());
            assert(approved == get_contract_address() || is_approved_for_all, 'NFT not approved');
            
            // Create swap
            let swap_id = self.next_swap_id.read();
            self.next_swap_id.write(swap_id + 1);
            
            // Store swap data
            self.swap_creators.write(swap_id, caller);
            self.swap_nft_contracts.write(swap_id, nft_contract);
            self.swap_nft_ids.write(swap_id, nft_id);
            self.swap_prices.write(swap_id, price);
            self.swap_expiries.write(swap_id, expiry);
            self.swap_statuses.write(swap_id, SwapStatus::Created);
            self.swap_created_ats.write(swap_id, current_time);
            self.swap_accepted_ats.write(swap_id, Option::None);
            self.swap_cancelled_ats.write(swap_id, Option::None);
            self.swap_disputed_ats.write(swap_id, Option::None);
            self.swap_dispute_resolved_ats.write(swap_id, Option::None);
            self.swap_dispute_winners.write(swap_id, Option::None);
            
            // Update user data
            let mut user_swaps = self.user_swaps.read(caller);
            user_swaps.append(swap_id);
            self.user_swaps.write(caller, user_swaps);
            
            let mut active_swaps = self.active_swaps.read();
            active_swaps.append(swap_id);
            self.active_swaps.write(active_swaps);
            
            // Update statistics
            self.user_swap_count.write(caller, user_swaps + 1);
            self.last_swap_time.write(caller, current_time);
            self.total_swaps_created.write(self.total_swaps_created.read() + 1);
            
            // Transfer NFT to escrow
            nft_dispatcher.transfer_from(caller, get_contract_address(), nft_id);
            
            // Emit event
            self.emit(Event::SwapCreated(SwapCreated {
                swap_id,
                creator: caller,
                nft_contract,
                nft_id,
                price,
                expiry,
            }));
            
            swap_id
        }

        fn accept_swap(ref self: ContractState, swap_id: u256) {
            // Check contract state
            assert(!self.paused.read(), 'Contract is paused');
            assert(!self.emergency_stop.read(), 'Emergency stop active');
            
            let creator = self.swap_creators.read(swap_id);
            assert(creator != ContractAddress::default(), 'Swap not found');
            
            let status = self.swap_statuses.read(swap_id);
            assert(status == SwapStatus::Created, 'Swap not active');
            
            let current_time = get_block_timestamp();
            let expiry = self.swap_expiries.read(swap_id);
            assert(current_time < expiry, 'Swap expired');
            
            let caller = get_caller_address();
            assert(caller != creator, 'Cannot accept own swap');
            
            // Check STRK balance and allowance
            let strk_contract = self.strk_contract.read();
            let strk_dispatcher = ISRC20Dispatcher { contract_address: strk_contract };
            
            let balance = strk_dispatcher.balance_of(caller);
            let allowance = strk_dispatcher.allowance(caller, get_contract_address());
            let price = self.swap_prices.read(swap_id);
            assert(balance >= price, 'Insufficient STRK balance');
            assert(allowance >= price, 'Insufficient STRK allowance');
            
            // Transfer STRK to escrow
            strk_dispatcher.transfer_from(caller, get_contract_address(), price);
            
            // Update swap status
            self.swap_statuses.write(swap_id, SwapStatus::Completed);
            self.swap_accepted_ats.write(swap_id, Option::Some(current_time));
            
            // Transfer NFT to buyer
            let nft_dispatcher = ISRC721Dispatcher { contract_address: creator };
            nft_dispatcher.transfer_from(get_contract_address(), caller, self.swap_nft_ids.read(swap_id));
            
            // Transfer STRK to seller (minus platform fee)
            let platform_fee = self.platform_fee.read();
            let seller_amount = price - platform_fee;
            strk_dispatcher.transfer(creator, seller_amount);
            
            // Transfer platform fee
            if platform_fee > 0 {
                let fee_recipient = self.platform_fee_recipient.read();
                strk_dispatcher.transfer(fee_recipient, platform_fee);
            }
            
            // Remove from active swaps
            self._remove_from_active_swaps(swap_id);
            
            // Update statistics
            self.total_swaps_completed.write(self.total_swaps_completed.read() + 1);
            self.total_volume.write(self.total_volume.read() + price);
            
            // Emit event
            self.emit(Event::SwapAccepted(SwapAccepted {
                swap_id,
                acceptor: caller,
                accepted_at: current_time,
            }));
        }

        fn cancel_swap(ref self: ContractState, swap_id: u256) {
            // Check contract state
            assert(!self.paused.read(), 'Contract is paused');
            assert(!self.emergency_stop.read(), 'Emergency stop active');
            
            let creator = self.swap_creators.read(swap_id);
            assert(creator != ContractAddress::default(), 'Swap not found');
            
            let status = self.swap_statuses.read(swap_id);
            assert(status == SwapStatus::Created, 'Swap not active');
            
            let caller = get_caller_address();
            let current_time = get_block_timestamp();
            let expiry = self.swap_expiries.read(swap_id);
            
            // Only creator can cancel, or anyone after expiry
            if caller != creator {
                assert(current_time >= expiry, 'Not authorized to cancel');
            }
            
            // Update swap status
            self.swap_statuses.write(swap_id, SwapStatus::Cancelled);
            self.swap_cancelled_ats.write(swap_id, Option::Some(current_time));
            
            // Return NFT to creator
            let nft_dispatcher = ISRC721Dispatcher { contract_address: creator };
            nft_dispatcher.transfer_from(get_contract_address(), creator, self.swap_nft_ids.read(swap_id));
            
            // Remove from active swaps
            self._remove_from_active_swaps(swap_id);
            
            // Emit event
            self.emit(Event::SwapCancelled(SwapCancelled {
                swap_id,
                cancelled_by: caller,
                cancelled_at: current_time,
            }));
        }

        fn dispute_swap(ref self: ContractState, swap_id: u256) {
            // Check contract state
            assert(!self.paused.read(), 'Contract is paused');
            assert(!self.emergency_stop.read(), 'Emergency stop active');
            
            let creator = self.swap_creators.read(swap_id);
            assert(creator != ContractAddress::default(), 'Swap not found');
            
            let status = self.swap_statuses.read(swap_id);
            assert(status == SwapStatus::Created, 'Swap not active');
            
            let caller = get_caller_address();
            assert(caller == creator, 'Only creator can dispute');
            
            // Update swap status
            self.swap_statuses.write(swap_id, SwapStatus::Disputed);
            self.swap_disputed_ats.write(swap_id, Option::Some(get_block_timestamp()));
            
            // Emit event
            self.emit(Event::SwapDisputed(SwapDisputed {
                swap_id,
                disputed_by: caller,
                disputed_at: get_block_timestamp(),
            }));
        }

        fn resolve_dispute(
            ref self: ContractState,
            swap_id: u256,
            winner: ContractAddress,
        ) {
            // Check contract state
            assert(!self.paused.read(), 'Contract is paused');
            assert(!self.emergency_stop.read(), 'Emergency stop active');
            
            let caller = get_caller_address();
            let moderator = self.moderator.read();
            assert(caller == moderator, 'Only moderator can resolve disputes');
            
            let creator = self.swap_creators.read(swap_id);
            assert(creator != ContractAddress::default(), 'Swap not found');
            
            let status = self.swap_statuses.read(swap_id);
            assert(status == SwapStatus::Disputed, 'Swap not disputed');
            
            // Check dispute period has elapsed
            let dispute_period = self.dispute_period.read();
            let current_time = get_block_timestamp();
            let disputed_at = self.swap_disputed_ats.read(swap_id).unwrap();
            assert(current_time >= disputed_at + dispute_period, 'Dispute period not elapsed');
            
            // Validate winner
            assert(winner == creator || winner != ContractAddress::default(), 'Invalid winner');
            
            // Update swap status
            self.swap_statuses.write(swap_id, SwapStatus::Completed);
            self.swap_dispute_resolved_ats.write(swap_id, Option::Some(current_time));
            self.swap_dispute_winners.write(swap_id, Option::Some(winner));
            
            // Remove from active swaps
            self._remove_from_active_swaps(swap_id);
            
            // Emit event
            self.emit(Event::DisputeResolved(DisputeResolved {
                swap_id,
                winner,
                resolved_at: current_time,
            }));
        }

        fn get_swap(self: @ContractState, swap_id: u256) -> (ContractAddress, ContractAddress, u256, u256, u64, u8, u64, Option<u64>, Option<u64>, Option<u64>, Option<u64>, Option<ContractAddress>) {
            let creator = self.swap_creators.read(swap_id);
            assert(creator != ContractAddress::default(), 'Swap not found');
            
            let nft_contract = self.swap_nft_contracts.read(swap_id);
            let nft_id = self.swap_nft_ids.read(swap_id);
            let price = self.swap_prices.read(swap_id);
            let expiry = self.swap_expiries.read(swap_id);
            let status = self.swap_statuses.read(swap_id);
            let created_at = self.swap_created_ats.read(swap_id);
            let accepted_at = self.swap_accepted_ats.read(swap_id);
            let cancelled_at = self.swap_cancelled_ats.read(swap_id);
            let disputed_at = self.swap_disputed_ats.read(swap_id);
            let dispute_resolved_at = self.swap_dispute_resolved_ats.read(swap_id);
            let dispute_winner = self.swap_dispute_winners.read(swap_id);
            
            (creator, nft_contract, nft_id, price, expiry, status.into(), created_at, accepted_at, cancelled_at, disputed_at, dispute_resolved_at, dispute_winner)
        }

        fn get_user_swaps(self: @ContractState, user: ContractAddress) -> Array<u256> {
            self.user_swaps.read(user)
        }

        fn get_active_swaps(self: @ContractState) -> Array<u256> {
            self.active_swaps.read()
        }
    }

    // Admin functions
    #[external(v0)]
    impl AdminImpl of AdminTrait<ContractState> {
        fn set_admin(ref self: ContractState, new_admin: ContractAddress) {
            let caller = get_caller_address();
            let admin = self.admin.read();
            assert(caller == admin, 'Only admin can change admin');
            
            let old_admin = admin;
            self.admin.write(new_admin);
            
            self.emit(Event::AdminChanged(AdminChanged {
                old_admin,
                new_admin,
            }));
        }

        fn set_moderator(ref self: ContractState, new_moderator: ContractAddress) {
            let caller = get_caller_address();
            let admin = self.admin.read();
            assert(caller == admin, 'Only admin can change moderator');
            
            let old_moderator = self.moderator.read();
            self.moderator.write(new_moderator);
            
            self.emit(Event::ModeratorChanged(ModeratorChanged {
                old_moderator,
                new_moderator,
            }));
        }

        fn set_strk_contract(ref self: ContractState, strk_contract: ContractAddress) {
            let caller = get_caller_address();
            let admin = self.admin.read();
            assert(caller == admin, 'Only admin can set STRK contract');
            
            self.strk_contract.write(strk_contract);
        }

        fn set_platform_fee(ref self: ContractState, fee: u256) {
            let caller = get_caller_address();
            let admin = self.admin.read();
            assert(caller == admin, 'Only admin can set platform fee');
            
            self.platform_fee.write(fee);
        }

        fn set_platform_fee_recipient(ref self: ContractState, recipient: ContractAddress) {
            let caller = get_caller_address();
            let admin = self.admin.read();
            assert(caller == admin, 'Only admin can set fee recipient');
            
            self.platform_fee_recipient.write(recipient);
        }

        fn pause(ref self: ContractState) {
            let caller = get_caller_address();
            let admin = self.admin.read();
            assert(caller == admin, 'Only admin can pause');
            
            self.paused.write(true);
        }

        fn unpause(ref self: ContractState) {
            let caller = get_caller_address();
            let admin = self.admin.read();
            assert(caller == admin, 'Only admin can unpause');
            
            self.paused.write(false);
        }

        fn emergency_stop(ref self: ContractState) {
            let caller = get_caller_address();
            let admin = self.admin.read();
            assert(caller == admin, 'Only admin can emergency stop');
            
            self.emergency_stop.write(true);
            
            self.emit(Event::EmergencyStop(EmergencyStop {
                stopped_by: caller,
                stopped_at: get_block_timestamp(),
            }));
        }
    }

    // Internal helper functions
    impl InternalImpl of InternalTrait {
        fn _remove_from_active_swaps(ref self: ContractState, swap_id: u256) {
            let mut active_swaps = self.active_swaps.read();
            let mut new_active_swaps = ArrayTrait::new();
            
            let mut i = 0;
            let len = active_swaps.len();
            while i < len {
                let current_id = *active_swaps.at(i.into());
                if current_id != swap_id {
                    new_active_swaps.append(current_id);
                }
                i += 1;
            }
            
            self.active_swaps.write(new_active_swaps);
        }
    }

    // Admin trait
    #[starknet::interface]
    trait AdminTrait<TContractState> {
        fn set_admin(ref self: TContractState, new_admin: ContractAddress);
        fn set_moderator(ref self: TContractState, new_moderator: ContractAddress);
        fn set_strk_contract(ref self: TContractState, strk_contract: ContractAddress);
        fn set_platform_fee(ref self: TContractState, fee: u256);
        fn set_platform_fee_recipient(ref self: TContractState, recipient: ContractAddress);
        fn pause(ref self: TContractState);
        fn unpause(ref self: TContractState);
        fn emergency_stop(ref self: TContractState);
    }
} 