use starknet::ContractAddress;

use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};

use nftopia::IHelloStarknetSafeDispatcher;
use nftopia::IHelloStarknetSafeDispatcherTrait;
use nftopia::IHelloStarknetDispatcher;
use nftopia::IHelloStarknetDispatcherTrait;
use nftopia::ICollectionFactoryDispatcher;
use nftopia::ICollectionFactoryDispatcherTrait;

fn deploy_contract(name: ByteArray) -> ContractAddress {
    let contract = declare(name).unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@ArrayTrait::new()).unwrap();
    contract_address
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
    let contract_address = deploy_contract("CollectionFactory");

    let dispatcher = ICollectionFactoryDispatcher { contract_address };

    // Call create_collection
    dispatcher.create_collection();

    // Verify the collection was created
    let user_collections = dispatcher.get_user_collections(get_caller_address());
    assert(user_collections.len() == 1, "Collection not created");
}

#[test]
fn test_user_collection_tracking() {
    let contract_address = deploy_contract("CollectionFactory");

    let dispatcher = ICollectionFactoryDispatcher { contract_address };

    // Create multiple collections
    dispatcher.create_collection();
    dispatcher.create_collection();

    // Verify the collections are tracked
    let user_collections = dispatcher.get_user_collections(get_caller_address());
    assert(user_collections.len() == 2, "Collections not tracked correctly");
}

#[test]
fn test_collection_created_event() {
    let contract_address = deploy_contract("CollectionFactory");

    let dispatcher = ICollectionFactoryDispatcher { contract_address };

    // Call create_collection and capture events
    dispatcher.create_collection();

    // Verify the CollectionCreated event was emitted
    let events = get_emitted_events(contract_address);
    assert(events.len() > 0, "No events emitted");
    assert(events[0].name == "CollectionCreated", "Incorrect event emitted");
}
