#[cfg(test)]
mod tests {
    use nftopia::contracts::escrow_contract::{
        IEscrowDispatcher,
        IEscrowDispatcherTrait,
        IAdminDispatcher,
        IAdminDispatcherTrait
    };
    use starknet::ContractAddress;
    use starknet::contract_address::contract_address_const;
    // use core::num::u256;
    use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
    use core::array::ArrayTrait;
    use starknet::get_caller_address;



    fn deploy_escrow() -> ContractAddress {
        let contract = declare("EscrowContract").unwrap().contract_class();
        let (contract_address, _) = contract.deploy(@ArrayTrait::new()).unwrap();
        contract_address
    }

    #[test]
    fn test_constructor_and_admin_functions() {
        let contract_address = deploy_escrow();
        let admin_dispatcher = IAdminDispatcher { contract_address };

        let TEST_ADMIN: ContractAddress = contract_address_const::<0x1234>();
        let TEST_USER: ContractAddress = contract_address_const::<0x5678>();

        // Verify initial admin
        let admin = admin_dispatcher.get_admin();
        assert(admin == TEST_ADMIN, 'Incorrect initial admin');

        // Test pause/unpause
        admin_dispatcher.pause();
        assert(admin_dispatcher.is_paused(), 'Contract should be paused');
        admin_dispatcher.unpause();
        assert(!admin_dispatcher.is_paused(), 'Contract should be unpaused');

        // Test moderator setting
        admin_dispatcher.set_moderator(TEST_USER);
        let moderator = admin_dispatcher.get_moderator();
        assert(moderator == TEST_USER, 'Moderator not set correctly');
    }

    #[test]
    fn test_swap_creation() {
        let contract_address = deploy_escrow();
        let escrow_dispatcher = IEscrowDispatcher { contract_address };
        let TEST_NFT_CONTRACT: ContractAddress = contract_address_const::<0x9abc>();
        let TEST_NFT_ID: u256 = u256 { low: 1, high: 0 };
        let TEST_PRICE: u256 = u256 { low: 100, high: 0 };
        let TEST_EXPIRY_OFFSET: u64 = 3600 * 2; // 2 hours
        
        let current_time = starknet::get_block_timestamp();
        let expiry = current_time + TEST_EXPIRY_OFFSET;

        // Create swap
        let swap_id = escrow_dispatcher.create_swap(
            TEST_NFT_CONTRACT,
            TEST_NFT_ID,
            TEST_PRICE,
            expiry
        );

        // Verify swap details
        let (creator, nft_contract, nft_id, price, swap_expiry, status) = 
            escrow_dispatcher.get_swap(swap_id);
        
        assert(creator == get_caller_address(), 'Wrong creator');
        assert(nft_contract == TEST_NFT_CONTRACT, 'Wrong NFT contract');
        assert(nft_id == TEST_NFT_ID, 'Wrong NFT ID');
        assert(price == TEST_PRICE, 'Wrong price');
        assert(swap_expiry == expiry, 'Wrong expiry');
        assert(status == 0, 'Wrong initial status');

        // Verify stats
        assert(escrow_dispatcher.get_swap_count() == swap_id + 1, 'Wrong swap count');
        assert(escrow_dispatcher.get_total_swaps_created() == 1, 'Wrong created count');
    }

    #[test]
    fn test_swap_acceptance() {
        let contract_address = deploy_escrow();
        let escrow_dispatcher = IEscrowDispatcher { contract_address };

        let TEST_NFT_CONTRACT: ContractAddress = contract_address_const::<0x9abc>();
        let TEST_NFT_ID: u256 = u256 { low: 1, high: 0 };
        let TEST_PRICE: u256 = u256 { low: 100, high: 0 };
        let TEST_EXPIRY_OFFSET: u64 = 3600 * 2; // 2 hours
        
        // Create swap
        let expiry = starknet::get_block_timestamp() + TEST_EXPIRY_OFFSET;
        let swap_id = escrow_dispatcher.create_swap(
            TEST_NFT_CONTRACT,
            TEST_NFT_ID,
            TEST_PRICE,
            expiry
        );

        // Accept swap
        escrow_dispatcher.accept_swap(swap_id);

        // Verify status and stats
        let (_, _, _, _, _, status) = escrow_dispatcher.get_swap(swap_id);
        assert(status == 1, 'Swap should be accepted');
        assert(escrow_dispatcher.get_total_swaps_completed() == 1, 'Wrong completed count');
        assert(escrow_dispatcher.get_total_volume() == TEST_PRICE, 'Wrong volume');
    }

    #[test]
    fn test_swap_cancellation() {
        let contract_address = deploy_escrow();
        let escrow_dispatcher = IEscrowDispatcher { contract_address };

        let TEST_NFT_CONTRACT: ContractAddress = contract_address_const::<0x9abc>();
        let TEST_NFT_ID: u256 = u256 { low: 1, high: 0 };
        let TEST_PRICE: u256 = u256 { low: 100, high: 0 };
        let TEST_EXPIRY_OFFSET: u64 = 3600 * 2; // 2 hours
        
        // Create swap
        let expiry = starknet::get_block_timestamp() + TEST_EXPIRY_OFFSET;
        let swap_id = escrow_dispatcher.create_swap(
            TEST_NFT_CONTRACT,
            TEST_NFT_ID,
            TEST_PRICE,
            expiry
        );

        // Cancel swap
        escrow_dispatcher.cancel_swap(swap_id);

        // Verify status
        let (_, _, _, _, _, status) = escrow_dispatcher.get_swap(swap_id);
        assert(status == 2, 'Swap should be cancelled');
    }

    #[test]
    fn test_swap_dispute() {
        let contract_address = deploy_escrow();
        let escrow_dispatcher = IEscrowDispatcher { contract_address };
        let TEST_NFT_CONTRACT: ContractAddress = contract_address_const::<0x9abc>();
        let TEST_NFT_ID: u256 = u256 { low: 1, high: 0 };
        let TEST_PRICE: u256 = u256 { low: 100, high: 0 };
        let TEST_EXPIRY_OFFSET: u64 = 3600 * 2; // 2 hours
        
        // Create swap
        let expiry = starknet::get_block_timestamp() + TEST_EXPIRY_OFFSET;
        let swap_id = escrow_dispatcher.create_swap(
            TEST_NFT_CONTRACT,
            TEST_NFT_ID,
            TEST_PRICE,
            expiry
        );

        // Dispute swap
        escrow_dispatcher.dispute_swap(swap_id);

        // Verify status
        let (_, _, _, _, _, status) = escrow_dispatcher.get_swap(swap_id);
        assert(status == 3, 'Swap should be disputed');
    }

    #[test]
    #[should_panic]
    fn test_expired_swap_acceptance() {
        let contract_address = deploy_escrow();
        let escrow_dispatcher = IEscrowDispatcher { contract_address };

        let TEST_NFT_CONTRACT: ContractAddress = contract_address_const::<0x9abc>();
        let TEST_NFT_ID: u256 = u256 { low: 1, high: 0 };
        let TEST_PRICE: u256 = u256 { low: 100, high: 0 };
        
        // Create swap with immediate expiry
        let swap_id = escrow_dispatcher.create_swap(
            TEST_NFT_CONTRACT,
            TEST_NFT_ID,
            TEST_PRICE,
            starknet::get_block_timestamp() - 1 // Already expired
        );

        // This should panic
        escrow_dispatcher.accept_swap(swap_id);
    }

    #[test]
    #[should_panic]
    fn test_self_acceptance() {
        let contract_address = deploy_escrow();
        let escrow_dispatcher = IEscrowDispatcher { contract_address };

        let TEST_NFT_CONTRACT: ContractAddress = contract_address_const::<0x9abc>();
        let TEST_NFT_ID: u256 = u256 { low: 1, high: 0 };
        let TEST_PRICE: u256 = u256 { low: 100, high: 0 };
        let TEST_EXPIRY_OFFSET: u64 = 3600 * 2; // 2 hours
        
        // Create swap
        let expiry = starknet::get_block_timestamp() + TEST_EXPIRY_OFFSET;
        let swap_id = escrow_dispatcher.create_swap(
            TEST_NFT_CONTRACT,
            TEST_NFT_ID,
            TEST_PRICE,
            expiry
        );

        // This should panic (can't accept your own swap)
        escrow_dispatcher.accept_swap(swap_id);
    }

    #[test]
    #[should_panic]
    fn test_paused_operations() {
        let contract_address = deploy_escrow();
        let escrow_dispatcher = IEscrowDispatcher { contract_address };
        let admin_dispatcher = IAdminDispatcher { contract_address };

        let TEST_NFT_CONTRACT: ContractAddress = contract_address_const::<0x9abc>();
        let TEST_NFT_ID: u256 = u256 { low: 1, high: 0 };
        let TEST_PRICE: u256 = u256 { low: 100, high: 0 };
        let TEST_EXPIRY_OFFSET: u64 = 3600 * 2; // 2 hours

        // Pause contract
        admin_dispatcher.pause();

        // This should panic (operations paused)
        escrow_dispatcher.create_swap(
            TEST_NFT_CONTRACT,
            TEST_NFT_ID,
            TEST_PRICE,
            starknet::get_block_timestamp() + TEST_EXPIRY_OFFSET
        );
    }
}