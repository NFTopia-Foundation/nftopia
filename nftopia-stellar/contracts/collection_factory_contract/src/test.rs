#![cfg(test)]

use soroban_sdk::{testutils::Address as _, Address, Env, String};

use crate::{CollectionFactoryContract, CollectionFactoryContractClient};

#[test]
fn test_initialize_and_create_collection() {
    let env = Env::default();
    
    // Create test addresses
    let owner = Address::generate(&env);
    let creator = Address::generate(&env);
    
    // Deploy contract
    let contract_id = env.register_contract(None, CollectionFactoryContract);
    let client = CollectionFactoryContractClient::new(&env, &contract_id);
    
    // Initialize factory
    client.initialize(&owner);
    
    // Create collection
    let collection_id = client.create_collection(
        &creator,
        &String::from_str(&env, "Test Collection"),
        &String::from_str(&env, "TEST"),
        &String::from_str(&env, "A test NFT collection"),
        &String::from_str(&env, "https://api.nftopia.com/metadata/"),
        &None::<u32>,
        &true,
        &500, // 5% royalty
        &creator,
        &0, // Basic metadata schema
        &true,
        &false,
    );
    
    assert!(collection_id > 0);
    
    // Verify collection count
    let count = client.get_collection_count();
    assert_eq!(count, 1);
    
    // Verify collection address
    let address = client.get_collection_address(&collection_id);
    assert!(address.is_contract());
}

#[test]
fn test_mint_and_transfer() {
    let env = Env::default();
    
    // Create test addresses
    let owner = Address::generate(&env);
    let creator = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    // Deploy and initialize
    let contract_id = env.register_contract(None, CollectionFactoryContract);
    let client = CollectionFactoryContractClient::new(&env, &contract_id);
    client.initialize(&owner);
    
    // Create collection
    let collection_id = client.create_collection(
        &creator,
        &String::from_str(&env, "Test Collection"),
        &String::from_str(&env, "TEST"),
        &String::from_str(&env, "A test NFT collection"),
        &String::from_str(&env, "https://api.nftopia.com/metadata/"),
        &None::<u32>,
        &true,
        &500,
        &creator,
        &0,
        &true,
        &false,
    );
    
    // Mint token
    let token_id = client.mint(
        &collection_id,
        &creator,
        &String::from_str(&env, "https://api.nftopia.com/metadata/1"),
        &None,
    );
    
    assert_eq!(token_id, 1);
    
    // Verify owner
    let token_owner = client.owner_of(&collection_id, &token_id);
    assert_eq!(token_owner, creator);
    
    // Verify balance
    let balance = client.balance_of(&collection_id, &creator);
    assert_eq!(balance, 1);
    
    // Transfer token
    client.transfer(&collection_id, &creator, &recipient, &token_id);
    
    // Verify new owner
    let new_owner = client.owner_of(&collection_id, &token_id);
    assert_eq!(new_owner, recipient);
    
    // Verify balances updated
    let creator_balance = client.balance_of(&collection_id, &creator);
    let recipient_balance = client.balance_of(&collection_id, &recipient);
    assert_eq!(creator_balance, 0);
    assert_eq!(recipient_balance, 1);
}

#[test]
fn test_batch_mint() {
    let env = Env::default();
    
    let owner = Address::generate(&env);
    let creator = Address::generate(&env);
    
    let contract_id = env.register_contract(None, CollectionFactoryContract);
    let client = CollectionFactoryContractClient::new(&env, &contract_id);
    client.initialize(&owner);
    
    let collection_id = client.create_collection(
        &creator,
        &String::from_str(&env, "Test Collection"),
        &String::from_str(&env, "TEST"),
        &String::from_str(&env, "A test NFT collection"),
        &String::from_str(&env, "https://api.nftopia.com/metadata/"),
        &None::<u32>,
        &true,
        &500,
        &creator,
        &0,
        &true,
        &false,
    );
    
    // Create URIs for batch mint
    let uris = vec![
        &env,
        String::from_str(&env, "https://api.nftopia.com/metadata/1"),
        String::from_str(&env, "https://api.nftopia.com/metadata/2"),
        String::from_str(&env, "https://api.nftopia.com/metadata/3"),
    ];
    
    // Batch mint
    let token_ids = client.batch_mint(&collection_id, &creator, &uris, &None);
    
    assert_eq!(token_ids.len(), 3);
    assert_eq!(token_ids.get(0).unwrap(), 1);
    assert_eq!(token_ids.get(1).unwrap(), 2);
    assert_eq!(token_ids.get(2).unwrap(), 3);
    
    // Verify total supply
    let total_supply = client.total_supply(&collection_id);
    assert_eq!(total_supply, 3);
}

#[test]
fn test_royalty_management() {
    let env = Env::default();
    
    let owner = Address::generate(&env);
    let creator = Address::generate(&env);
    let royalty_recipient = Address::generate(&env);
    
    let contract_id = env.register_contract(None, CollectionFactoryContract);
    let client = CollectionFactoryContractClient::new(&env, &contract_id);
    client.initialize(&owner);
    
    let collection_id = client.create_collection(
        &creator,
        &String::from_str(&env, "Royalty Collection"),
        &String::from_str(&env, "ROYAL"),
        &String::from_str(&env, "Collection with royalties"),
        &String::from_str(&env, "https://api.nftopia.com/metadata/"),
        &None::<u32>,
        &true,
        &1000, // 10% royalty
        &royalty_recipient,
        &0,
        &true,
        &false,
    );
    
    // Get royalty info
    let royalty_info = client.royalty_info(&collection_id);
    assert!(royalty_info.is_some());
    
    if let Some(info) = royalty_info {
        assert_eq!(info.recipient, royalty_recipient);
        assert_eq!(info.percentage, 1000);
    }
    
    // Update royalty info
    let new_recipient = Address::generate(&env);
    client.set_royalty_info(&collection_id, &creator, &new_recipient, &750); // 7.5%
    
    // Verify update
    let updated_info = client.royalty_info(&collection_id).unwrap();
    assert_eq!(updated_info.recipient, new_recipient);
    assert_eq!(updated_info.percentage, 750);
}