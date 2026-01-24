#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec, Map, Val};

mod errors;
mod events;
mod storage;
mod collection;
mod factory;

use errors::Error;
use events::Event;
use storage::{DataKey, CollectionConfig, TokenMetadata};
use collection::Collection;
use factory::Factory;

#[contract]
pub struct CollectionFactoryContract;

#[contractimpl]
impl CollectionFactoryContract {
    // Initialize the factory (only callable once)
    pub fn initialize(env: Env, owner: Address) -> Result<(), Error> {
        Factory::initialize(&env, owner)
    }
    
    // Factory management functions
    pub fn create_collection(
        env: Env,
        caller: Address,
        name: String,
        symbol: String,
        description: String,
        base_uri: String,
        max_supply: Option<u32>,
        is_public_mint: bool,
        royalty_percentage: u32,
        royalty_recipient: Address,
        metadata_schema: u32,
        is_pausable: bool,
        is_upgradeable: bool,
    ) -> Result<u64, Error> {
        let config = CollectionConfig {
            name,
            symbol,
            description,
            base_uri,
            max_supply,
            is_public_mint,
            royalty_percentage,
            royalty_recipient,
            metadata_schema: storage::MetadataSchema::Basic, // Simplified
            is_pausable,
            is_upgradeable,
        };
        
        Factory::create_collection(&env, &caller, config, Some(royalty_recipient))
    }
    
    pub fn get_collection_count(env: Env) -> Result<u32, Error> {
        Factory::get_collection_count(&env)
    }
    
    pub fn get_collection_address(env: Env, collection_id: u64) -> Result<Address, Error> {
        Factory::get_collection_address(&env, collection_id)
    }
    
    pub fn set_factory_fee(env: Env, caller: Address, fee: i128) -> Result<(), Error> {
        Factory::set_factory_fee(&env, &caller, fee)
    }
    
    pub fn withdraw_fees(
        env: Env,
        caller: Address,
        recipient: Address,
        amount: i128,
    ) -> Result<(), Error> {
        Factory::withdraw_fees(&env, &caller, recipient, amount)
    }
    
    pub fn set_max_collections(
        env: Env,
        caller: Address,
        max: Option<u32>,
    ) -> Result<(), Error> {
        Factory::set_max_collections(&env, &caller, max)
    }
    
    // Collection functions
    pub fn mint(
        env: Env,
        collection_id: u64,
        to: Address,
        uri: String,
        attributes: Option<Map<String, String>>,
    ) -> Result<u32, Error> {
        Collection::mint(&env, collection_id, &to, uri, attributes)
    }
    
    pub fn batch_mint(
        env: Env,
        collection_id: u64,
        to: Address,
        uris: Vec<String>,
        attributes_list: Option<Vec<Map<String, String>>>,
    ) -> Result<Vec<u32>, Error> {
        Collection::batch_mint(&env, collection_id, &to, uris, attributes_list)
    }
    
    pub fn transfer(
        env: Env,
        collection_id: u64,
        from: Address,
        to: Address,
        token_id: u32,
    ) -> Result<(), Error> {
        Collection::transfer(&env, collection_id, &from, &to, token_id)
    }
    
    pub fn batch_transfer(
        env: Env,
        collection_id: u64,
        from: Address,
        to: Address,
        token_ids: Vec<u32>,
    ) -> Result<(), Error> {
        Collection::batch_transfer(&env, collection_id, &from, &to, token_ids)
    }
    
    pub fn burn(
        env: Env,
        collection_id: u64,
        owner: Address,
        token_id: u32,
    ) -> Result<(), Error> {
        Collection::burn(&env, collection_id, &owner, token_id)
    }
    
    pub fn approve(
        env: Env,
        collection_id: u64,
        owner: Address,
        approved: Address,
        token_id: u32,
    ) -> Result<(), Error> {
        Collection::approve(&env, collection_id, &owner, &approved, token_id)
    }
    
    pub fn set_approval_for_all(
        env: Env,
        collection_id: u64,
        owner: Address,
        operator: Address,
        approved: bool,
    ) -> Result<(), Error> {
        Collection::set_approval_for_all(&env, collection_id, &owner, &operator, approved)
    }
    
    pub fn set_royalty_info(
        env: Env,
        collection_id: u64,
        caller: Address,
        recipient: Address,
        percentage: u32,
    ) -> Result<(), Error> {
        Collection::set_royalty_info(&env, collection_id, &caller, recipient, percentage)
    }
    
    pub fn set_whitelist(
        env: Env,
        collection_id: u64,
        caller: Address,
        address: Address,
        whitelisted: bool,
    ) -> Result<(), Error> {
        Collection::set_whitelist(&env, collection_id, &caller, address, whitelisted)
    }
    
    pub fn set_paused(
        env: Env,
        collection_id: u64,
        caller: Address,
        paused: bool,
    ) -> Result<(), Error> {
        Collection::set_paused(&env, collection_id, &caller, paused)
    }
    
    // Query functions
    pub fn balance_of(
        env: Env,
        collection_id: u64,
        address: Address,
    ) -> Result<u32, Error> {
        Collection::balance_of(&env, collection_id, &address)
    }
    
    pub fn owner_of(
        env: Env,
        collection_id: u64,
        token_id: u32,
    ) -> Result<Address, Error> {
        Collection::owner_of(&env, collection_id, token_id)
    }
    
    pub fn get_approved(
        env: Env,
        collection_id: u64,
        token_id: u32,
    ) -> Result<Option<Address>, Error> {
        Collection::get_approved(&env, collection_id, token_id)
    }
    
    pub fn is_approved_for_all(
        env: Env,
        collection_id: u64,
        owner: Address,
        operator: Address,
    ) -> Result<bool, Error> {
        Collection::is_approved_for_all(&env, collection_id, &owner, &operator)
    }
    
    pub fn token_uri(
        env: Env,
        collection_id: u64,
        token_id: u32,
    ) -> Result<String, Error> {
        Collection::token_uri(&env, collection_id, token_id)
    }
    
    pub fn token_metadata(
        env: Env,
        collection_id: u64,
        token_id: u32,
    ) -> Result<TokenMetadata, Error> {
        Collection::token_metadata(&env, collection_id, token_id)
    }
    
    pub fn total_supply(
        env: Env,
        collection_id: u64,
    ) -> Result<u32, Error> {
        Collection::total_supply(&env, collection_id)
    }
    
    pub fn royalty_info(
        env: Env,
        collection_id: u64,
    ) -> Result<Option<storage::RoyaltyInfo>, Error> {
        Collection::royalty_info(&env, collection_id)
    }
}

#[cfg(test)]
mod test;