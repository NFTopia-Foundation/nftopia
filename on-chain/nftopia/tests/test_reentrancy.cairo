#[cfg(test)]
mod tests {
    use super::*;
    use starknet::test_utils::{get_contract_address, get_caller_address, set_caller_address, set_block_timestamp};
    use starknet::contract_address::ContractAddress;
    use starknet::testing::{cheatcode, set_contract_address};
    use core::traits::Into;

    #[test]
    fn test_create_swap() {
        // Setup
        let mut state = EscrowContract::contract_state_for_testing();
        let caller: ContractAddress = 123.into();
        let nft_contract: ContractAddress = 456.into();
        let nft_id = 789_u256;
        let price = 1000_u256;
        let expiry = get_block_timestamp() + 5000;

        set_caller_address(caller);
        
        // Test
        let swap_id = state.create_swap(nft_contract, nft_id, price, expiry);
        
        // Verify
        let (creator, contract, id, swap_price, swap_expiry, status) = state.get_swap(swap_id);
        assert(creator == caller, "Creator mismatch");
        assert(contract == nft_contract, "NFT contract mismatch");
        assert(id == nft_id, "NFT ID mismatch");
        assert(swap_price == price, "Price mismatch");
        assert(swap_expiry == expiry, "Expiry mismatch");
        assert(status == 0, "Status should be active (0)");
        assert(state.get_swap_count() == 1_u256, "Swap count should increment");
    }

    #[test]
    #[should_panic(expected: ('Paused',))]
    fn test_create_swap_when_paused() {
        let mut state = EscrowContract::contract_state_for_testing();
        state.paused.write(0, true);
        
        state.create_swap(1.into(), 1_u256, 100_u256, get_block_timestamp() + 1000);
    }

    #[test]
    fn test_accept_swap() {
        // Setup swap
        let mut state = EscrowContract::contract_state_for_testing();
        let creator: ContractAddress = 123.into();
        let acceptor: ContractAddress = 456.into();
        let nft_contract: ContractAddress = 789.into();
        let swap_id = state.create_swap(nft_contract, 1_u256, 100_u256, get_block_timestamp() + 1000);
        
        // Test accept
        set_caller_address(acceptor);
        state.accept_swap(swap_id);
        
        // Verify
        let (_, _, _, _, _, status) = state.get_swap(swap_id);
        assert(status == 1, "Status should be accepted (1)");
        assert(state.get_total_swaps_completed() == 1_u256, "Completed swaps should increment");
    }

    #[test]
    #[should_panic(expected: ('Cannot accept own swap',))]
    fn test_accept_own_swap() {
        let mut state = EscrowContract::contract_state_for_testing();
        let creator: ContractAddress = 123.into();
        set_caller_address(creator);
        
        let swap_id = state.create_swap(1.into(), 1_u256, 100_u256, get_block_timestamp() + 1000);
        state.accept_swap(swap_id); // Should fail
    }

    #[test]
    fn test_reentrancy_protection() {
        let mut state = EscrowContract::contract_state_for_testing();
        
        // First call should work
        state.reentrancy_guard._assert_non_reentrant();
        state.reentrancy_guard._lock();
        
        // Second call should panic
        #[should_panic(expected: ('ReentrancyGuard: reentrant call',))]
        fn reentrant_call(state: &mut EscrowContract::ContractState) {
            state.reentrancy_guard._assert_non_reentrant();
        }
        
        reentrant_call(&mut state);
        
        // Cleanup
        state.reentrancy_guard._unlock();
    }

    #[test]
    fn test_cancel_swap() {
        let mut state = EscrowContract::contract_state_for_testing();
        let creator: ContractAddress = 123.into();
        set_caller_address(creator);
        
        let swap_id = state.create_swap(1.into(), 1_u256, 100_u256, get_block_timestamp() + 1000);
        state.cancel_swap(swap_id);
        
        let (_, _, _, _, _, status) = state.get_swap(swap_id);
        assert(status == 2, "Status should be cancelled (2)");
    }

    #[test]
    fn test_dispute_swap() {
        let mut state = EscrowContract::contract_state_for_testing();
        let creator: ContractAddress = 123.into();
        set_caller_address(creator);
        
        let swap_id = state.create_swap(1.into(), 1_u256, 100_u256, get_block_timestamp() + 1000);
        state.dispute_swap(swap_id);
        
        let (_, _, _, _, _, status) = state.get_swap(swap_id);
        assert(status == 3, "Status should be disputed (3)");
    }

    #[test]
    fn test_admin_functions() {
        let mut state = EscrowContract::contract_state_for_testing();
        let admin: ContractAddress = 123.into();
        let new_admin: ContractAddress = 456.into();
        
        // Set initial admin
        state.admin.write(0, admin);
        set_caller_address(admin);
        
        // Test admin functions
        state.set_admin(new_admin);
        assert(state.admin.read(0) == new_admin, "Admin should be updated");
        
        state.pause();
        assert(state.paused.read(0), "Contract should be paused");
        
        state.unpause();
        assert(!state.paused.read(0), "Contract should be unpaused");
    }

    #[test]
    #[should_panic(expected: ('Only admin can pause',))]
    fn test_non_admin_pause() {
        let mut state = EscrowContract::contract_state_for_testing();
        let admin: ContractAddress = 123.into();
        let non_admin: ContractAddress = 456.into();
        
        state.admin.write(0, admin);
        set_caller_address(non_admin);
        
        state.pause(); // Should fail
    }

    #[test]
    fn test_reentrancy_guard_events() {
        let mut state = EscrowContract::contract_state_for_testing();
        let attacker: ContractAddress = 999.into();
        
        // Simulate reentrancy attempt
        set_caller_address(attacker);
        state.reentrancy_guard._lock();
        
        // Should emit ReentrancyAttempt event
        #[should_panic]
        state.reentrancy_guard._assert_non_reentrant();
        
        // Note: In a real test environment, you would verify the event was emitted
        // This requires StarkNet testing framework support for event verification
    }
}