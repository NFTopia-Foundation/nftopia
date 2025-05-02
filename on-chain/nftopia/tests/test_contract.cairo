use starknet::{ContractAddress, ClassHash};
use snforge_std::{declare, ContractClassTrait, start_prank, stop_prank, CheatTarget};
use nftopia::{
    IHelloStarknetSafeDispatcher, IHelloStarknetSafeDispatcherTrait,
    IHelloStarknetDispatcher, IHelloStarknetDispatcherTrait,
    ICollectionFactoryDispatcher, ICollectionFactoryDispatcherTrait,
    CollectionCreated
};

// Helper function to deploy contracts
fn deploy_contract(name: ByteArray) -> ContractAddress {
    let contract = declare(name).unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@ArrayTrait::new()).unwrap();
    contract_address
}

fn deploy_collection_factory() -> (ContractAddress, ClassHash) {
    // First declare and deploy the INFI contract to get its class hash
    let infi_class = declare('INFI');
    let infi_hash = infi_class.class_hash;

    // Then deploy the collection factory with the INFI class hash
    let collection_factory = declare('CollectionFactory');
    let constructor_args = array![infi_hash.into()];
    let factory_address = collection_factory.deploy(@constructor_args).unwrap();

    (factory_address, infi_hash)
}

#[test]
fn test_increase_balance() {
    let contract_address = deploy_contract("HelloStarknet");

    let dispatcher = IHelloStarknetDispatcher { contract_address };

    let balance_before = dispatcher.get_balance();
    assert(balance_before == 0, 'Invalid balance');

    dispatcher.increase_balance(42);

    let balance_after = dispatcher.get_balance();
    assert(balance_after == 42, 'Invalid balance');
}

#[test]
#[feature("safe_dispatcher")]
fn test_cannot_increase_balance_with_zero_value() {
    let contract_address = deploy_contract("HelloStarknet");

    let safe_dispatcher = IHelloStarknetSafeDispatcher { contract_address };

    let balance_before = safe_dispatcher.get_balance().unwrap();
    assert(balance_before == 0, 'Invalid balance');

    match safe_dispatcher.increase_balance(0) {
        Result::Ok(_) => core::panic_with_felt252('Should have panicked'),
        Result::Err(panic_data) => {
            assert(*panic_data.at(0) == 'Amount cannot be 0', *panic_data.at(0));
        }
    };
}

#[test]
fn test_create_collection() {
    let (factory_address, _) = deploy_collection_factory();
    let factory = ICollectionFactoryDispatcher { contract_address: factory_address };

    // Set caller address for testing
    let caller = contract_address_const::<1>();
    start_prank(CheatTarget::One(factory_address), caller);

    // Create a collection
    let collection_address = factory.create_collection('TestNFT', 'TNFT');
    
    // Verify the collection was created and tracked
    let user_collections = factory.get_user_collections(caller);
    assert!(user_collections.len() == 1, "Collection not created");
    assert!(user_collections.at(0) == collection_address, "Wrong collection address");

    stop_prank(CheatTarget::One(factory_address));
}

#[test]
fn test_multiple_collections() {
    let (factory_address, _) = deploy_collection_factory();
    let factory = ICollectionFactoryDispatcher { contract_address: factory_address };

    // Set caller address for testing
    let caller = contract_address_const::<1>();
    start_prank(CheatTarget::One(factory_address), caller);

    // Create multiple collections
    let collection1 = factory.create_collection('TestNFT1', 'TNFT1');
    let collection2 = factory.create_collection('TestNFT2', 'TNFT2');

    // Verify all collections are tracked
    let user_collections = factory.get_user_collections(caller);
    assert!(user_collections.len() == 2, "Not all collections tracked");
    assert!(user_collections.at(0) == collection1, "Wrong first collection");
    assert!(user_collections.at(1) == collection2, "Wrong second collection");

    stop_prank(CheatTarget::One(factory_address));
}

#[test]
fn test_collection_created_event() {
    let (factory_address, _) = deploy_collection_factory();
    let factory = ICollectionFactoryDispatcher { contract_address: factory_address };

    // Set caller address for testing
    let caller = contract_address_const::<1>();
    start_prank(CheatTarget::One(factory_address), caller);

    // Create a collection and expect an event
    let collection_address = factory.create_collection('TestNFT', 'TNFT');

    // Get and verify the emitted event
    let event = spy_events(CheatTarget::One(factory_address)).unwrap();
    assert_eq!(
        event,
        array![CollectionCreated { creator: caller, collection: collection_address }].span()
    );

    stop_prank(CheatTarget::One(factory_address));
}
