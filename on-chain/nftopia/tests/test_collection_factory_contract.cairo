#[cfg(test)]
mod tests {
    use nftopia::contracts::collection_factory_contract::{
        ICollectionFactoryDispatcher,
        ICollectionFactoryDispatcherTrait
    };
    use starknet::ContractAddress;
    use starknet::contract_address::contract_address_const;
    use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
    use starknet::get_caller_address;

   

    fn deploy_factory() -> ContractAddress {
        let contract = declare("CollectionFactory").unwrap().contract_class();
        let (contract_address, _) = contract.deploy(@ArrayTrait::new()).unwrap();
        contract_address
    }

    #[test]
    fn test_collection_creation() {
        let factory_address = deploy_factory();
        let factory = ICollectionFactoryDispatcher { contract_address: factory_address };

      

        // Create collection
        let collection = factory.create_collection();

        // Verify collection creation
        let user_collections = factory.get_user_collections(get_caller_address());
        assert!(user_collections.len() == 1, "Should have 1 collection");
        assert!(*user_collections.at(0) == collection, "Collection address mismatch");

        // Verify collection is recognized
        // Note: In real implementation, you'd check the collections map
    }

    #[test]
    fn test_single_nft_addition() {
        let factory_address = deploy_factory();
        let factory = ICollectionFactoryDispatcher { contract_address: factory_address };

        let TEST_USER: ContractAddress = contract_address_const::<0x1234>();
        let TEST_COLLECTION: ContractAddress = contract_address_const::<0x5678>();
        let TEST_TOKEN_ID: u256 = u256 { low: 1, high: 0 };
       


        // Create collection (in real test you'd use actual deployment)
        let collection = TEST_COLLECTION;

        // Add NFT
        factory.add_nft_to_collection(collection, TEST_USER, TEST_TOKEN_ID);

        // Verify NFT ownership
        assert!(factory.has_nft(TEST_USER, collection, TEST_TOKEN_ID),"User should own the NFT");
    }

    #[test]
    fn test_batch_nft_addition() {
        let factory_address = deploy_factory();
        let factory = ICollectionFactoryDispatcher { contract_address: factory_address };

        let TEST_USER: ContractAddress = contract_address_const::<0x1234>();
        let TEST_COLLECTION: ContractAddress = contract_address_const::<0x5678>();
       

        let collection = TEST_COLLECTION;
        const TEST_TOKEN_ID_1: u256 = u256 { low: 1, high: 0 };
        const TEST_TOKEN_ID_2: u256 = u256 { low: 2, high: 0 };
        const TEST_TOKEN_ID_3: u256 = u256 { low: 3, high: 0 };

        let mut token_ids = ArrayTrait::new();
        token_ids.append(TEST_TOKEN_ID_1);
        token_ids.append(TEST_TOKEN_ID_2);
        token_ids.append(TEST_TOKEN_ID_3);

        // Add multiple NFTs
        factory.add_nfts_to_collection(collection, TEST_USER, token_ids.span());

        // Verify all NFTs were added
        assert!(factory.has_nft(TEST_USER, collection, TEST_TOKEN_ID_1), "User should own NFT 1");
        assert!(factory.has_nft(TEST_USER, collection, TEST_TOKEN_ID_2), "User should own NFT 2");
        assert!(factory.has_nft(TEST_USER, collection, TEST_TOKEN_ID_3), "User should own NFT 3");
    }

    #[test]
    #[should_panic]
    fn test_unauthorized_nft_addition() {

        let factory_address = deploy_factory();
        let factory = ICollectionFactoryDispatcher { contract_address: factory_address };
        let TEST_USER: ContractAddress = contract_address_const::<0x1234>();
        let TEST_TOKEN_ID: u256 = u256 { low: 1, high: 0 };
       


        // Attempt to add NFT to non-existent collection
        factory.add_nft_to_collection(
            contract_address_const::<0x9999>(), // Random address
            TEST_USER,
            TEST_TOKEN_ID
        );
    }

    #[test]
    fn test_user_collections_query() {
        let factory_address = deploy_factory();
        let factory = ICollectionFactoryDispatcher { contract_address: factory_address };

        let TEST_USER: ContractAddress = contract_address_const::<0x1234>();
        let TEST_TOKEN_ID: u256 = u256 { low: 1, high: 0 };
       


        // Create multiple collections (in real test these would be actual deployments)
        let collection1 = contract_address_const::<0x1111>();
        let collection2 = contract_address_const::<0x2222>();

        // Simulate collection creation
        factory.add_nft_to_collection(collection1, TEST_USER, TEST_TOKEN_ID);
        factory.add_nft_to_collection(collection2, TEST_USER, TEST_TOKEN_ID);

        // Verify collections list
        let collections = factory.get_user_collections(TEST_USER);
        assert!(collections.len() == 2, "Should have 2 collections");
    }

    #[test]
    fn test_nft_ownership_check() {
        let factory_address = deploy_factory();
        let factory = ICollectionFactoryDispatcher { contract_address: factory_address };

        let TEST_USER: ContractAddress = contract_address_const::<0x1234>();
        let TEST_COLLECTION: ContractAddress = contract_address_const::<0x5678>();
        let TEST_TOKEN_ID: u256 = u256 { low: 1, high: 0 };
       


        let collection = TEST_COLLECTION;

        // Add NFT
        factory.add_nft_to_collection(collection, TEST_USER, TEST_TOKEN_ID);

        // Check ownership
        assert!(factory.has_nft(TEST_USER, collection, TEST_TOKEN_ID), "Should return true for owned NFT");
        assert!(!factory.has_nft(TEST_USER, collection, u256 { low: 999, high: 0 }), "Should return false for non-existent NFT");
    }

    #[test]
    #[should_panic]
    fn test_invalid_collection_access() {
        let factory_address = deploy_factory();
        let factory = ICollectionFactoryDispatcher { contract_address: factory_address };

        let TEST_USER: ContractAddress = contract_address_const::<0x1234>();
        let TEST_TOKEN_ID: u256 = u256 { low: 1, high: 0 };
        


        // Attempt to add to invalid collection
        factory.add_nft_to_collection(
            contract_address_const::<0x9999>(),
            TEST_USER,
            TEST_TOKEN_ID
        );
    }
}