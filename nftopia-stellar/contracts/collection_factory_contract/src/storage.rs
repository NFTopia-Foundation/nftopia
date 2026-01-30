use soroban_sdk::{contracttype, Address, Env, Map, Vec, String};

use crate::errors::Error;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MetadataSchema {
    Basic,
    Extended,
    Advanced,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CollectionConfig {
    pub name: String,
    pub symbol: String,
    pub description: String,
    pub base_uri: String,
    pub max_supply: Option<u32>,
    pub is_public_mint: bool,
    pub royalty_percentage: u32,
    pub royalty_recipient: Address,
    pub metadata_schema: MetadataSchema,
    pub is_pausable: bool,
    pub is_upgradeable: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenMetadata {
    pub token_id: u32,
    pub uri: String,
    pub attributes: Map<String, String>,
    pub creator: Address,
    pub created_at: u64,
    pub updated_at: Option<u64>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CollectionInfo {
    pub address: Address,
    pub creator: Address,
    pub config: CollectionConfig,
    pub created_at: u64,
    pub total_tokens: u32,
    pub is_paused: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoyaltyInfo {
    pub recipient: Address,
    pub percentage: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FactoryConfig {
    pub owner: Address,
    pub factory_fee: i128,
    pub max_collections: Option<u32>,
    pub total_collections: u32,
    pub accumulated_fees: i128,
    pub is_active: bool,
}


pub trait Storage {
    fn get_factory_config(env: &Env) -> Result<FactoryConfig, Error>;
    fn set_factory_config(env: &Env, config: &FactoryConfig);
    
    fn get_collection_info(env: &Env, collection_id: u64) -> Result<CollectionInfo, Error>;
    fn set_collection_info(env: &Env, collection_id: u64, info: &CollectionInfo);
    
    fn get_collections_count(env: &Env) -> u32;
    fn increment_collections_count(env: &Env);
    
    fn get_next_token_id(env: &Env, collection_id: u64) -> u32;
    fn set_next_token_id(env: &Env, collection_id: u64, next_id: u32);
    fn increment_token_id(env: &Env, collection_id: u64);
    
    fn get_token_owner(env: &Env, collection_id: u64, token_id: u32) -> Option<Address>;
    fn set_token_owner(env: &Env, collection_id: u64, token_id: u32, owner: &Address);
    fn remove_token_owner(env: &Env, collection_id: u64, token_id: u32);
    
    fn get_token_metadata(env: &Env, collection_id: u64, token_id: u32) -> Option<TokenMetadata>;
    fn set_token_metadata(env: &Env, collection_id: u64, token_id: u32, metadata: &TokenMetadata);
    
    fn get_balance(env: &Env, collection_id: u64, address: &Address) -> u32;
    fn set_balance(env: &Env, collection_id: u64, address: &Address, balance: u32);
    fn increment_balance(env: &Env, collection_id: u64, address: &Address);
    fn decrement_balance(env: &Env, collection_id: u64, address: &Address);
    
    fn get_approved(env: &Env, collection_id: u64, token_id: u32) -> Option<Address>;
    fn set_approved(env: &Env, collection_id: u64, token_id: u32, approved: &Address);
    fn remove_approved(env: &Env, collection_id: u64, token_id: u32);
    
    fn get_approved_for_all(env: &Env, collection_id: u64, owner: &Address, operator: &Address) -> bool;
    fn set_approved_for_all(env: &Env, collection_id: u64, owner: &Address, operator: &Address, approved: bool);
    
    fn get_royalty_info(env: &Env, collection_id: u64) -> Option<RoyaltyInfo>;
    fn set_royalty_info(env: &Env, collection_id: u64, royalty: &RoyaltyInfo);
    
    fn is_whitelisted_for_mint(env: &Env, collection_id: u64, address: &Address) -> bool;
    fn set_whitelisted_for_mint(env: &Env, collection_id: u64, address: &Address, whitelisted: bool);
    
    fn is_collection_paused(env: &Env, collection_id: u64) -> bool;
    fn set_collection_paused(env: &Env, collection_id: u64, paused: bool);
}

impl Storage for DataKey {
    fn get_factory_config(env: &Env) -> Result<FactoryConfig, Error> {
        env.storage()
            .instance()
            .get(&DataKey::FactoryConfig)
            .ok_or(Error::StorageError)
    }
    
    fn set_factory_config(env: &Env, config: &FactoryConfig) {
        env.storage().instance().set(&DataKey::FactoryConfig, config);
    }
    
    fn get_collection_info(env: &Env, collection_id: u64) -> Result<CollectionInfo, Error> {
        env.storage()
            .instance()
            .get(&DataKey::CollectionInfo(collection_id))
            .ok_or(Error::CollectionNotFound)
    }
    
    fn set_collection_info(env: &Env, collection_id: u64, info: &CollectionInfo) {
        env.storage()
            .instance()
            .set(&DataKey::CollectionInfo(collection_id), info);
    }
    
    fn get_collections_count(env: &Env) -> u32 {
        Self::get_factory_config(env)
            .map(|config| config.total_collections)
            .unwrap_or(0)
    }
    
    fn increment_collections_count(env: &Env) {
        let mut config = Self::get_factory_config(env).unwrap();
        config.total_collections += 1;
        Self::set_factory_config(env, &config);
    }
    
    fn get_next_token_id(env: &Env, collection_id: u64) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::NextTokenId(collection_id))
            .unwrap_or(1) // Start from token ID 1
    }
    
    fn set_next_token_id(env: &Env, collection_id: u64, next_id: u32) {
        env.storage()
            .instance()
            .set(&DataKey::NextTokenId(collection_id), &next_id);
    }
    
    fn increment_token_id(env: &Env, collection_id: u64) {
        let next_id = Self::get_next_token_id(env, collection_id) + 1;
        Self::set_next_token_id(env, collection_id, next_id);
    }
    
    fn get_token_owner(env: &Env, collection_id: u64, token_id: u32) -> Option<Address> {
        env.storage()
            .instance()
            .get(&DataKey::TokenOwner(collection_id, token_id))
    }
    
    fn set_token_owner(env: &Env, collection_id: u64, token_id: u32, owner: &Address) {
        env.storage()
            .instance()
            .set(&DataKey::TokenOwner(collection_id, token_id), owner);
    }
    
    fn remove_token_owner(env: &Env, collection_id: u64, token_id: u32) {
        env.storage()
            .instance()
            .remove(&DataKey::TokenOwner(collection_id, token_id));
    }
    
    fn get_token_metadata(env: &Env, collection_id: u64, token_id: u32) -> Option<TokenMetadata> {
        env.storage()
            .instance()
            .get(&DataKey::TokenMetadata(collection_id, token_id))
    }
    
    fn set_token_metadata(env: &Env, collection_id: u64, token_id: u32, metadata: &TokenMetadata) {
        env.storage()
            .instance()
            .set(&DataKey::TokenMetadata(collection_id, token_id), metadata);
    }
    
    fn get_balance(env: &Env, collection_id: u64, address: &Address) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::Balance(collection_id, address.clone()))
            .unwrap_or(0)
    }
    
    fn set_balance(env: &Env, collection_id: u64, address: &Address, balance: u32) {
        env.storage()
            .instance()
            .set(&DataKey::Balance(collection_id, address.clone()), &balance);
    }
    
    fn increment_balance(env: &Env, collection_id: u64, address: &Address) {
        let balance = Self::get_balance(env, collection_id, address) + 1;
        Self::set_balance(env, collection_id, address, balance);
    }
    
    fn decrement_balance(env: &Env, collection_id: u64, address: &Address) {
        let balance = Self::get_balance(env, collection_id, address);
        if balance > 0 {
            Self::set_balance(env, collection_id, address, balance - 1);
        }
    }
    
    fn get_approved(env: &Env, collection_id: u64, token_id: u32) -> Option<Address> {
        env.storage()
            .instance()
            .get(&DataKey::Approved(collection_id, token_id))
    }
    
    fn set_approved(env: &Env, collection_id: u64, token_id: u32, approved: &Address) {
        env.storage()
            .instance()
            .set(&DataKey::Approved(collection_id, token_id), approved);
    }
    
    fn remove_approved(env: &Env, collection_id: u64, token_id: u32) {
        env.storage()
            .instance()
            .remove(&DataKey::Approved(collection_id, token_id));
    }
    
    fn get_approved_for_all(env: &Env, collection_id: u64, owner: &Address, operator: &Address) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::ApprovedForAll(collection_id, owner.clone(), operator.clone()))
            .unwrap_or(false)
    }
    
    fn set_approved_for_all(env: &Env, collection_id: u64, owner: &Address, operator: &Address, approved: bool) {
        env.storage()
            .instance()
            .set(&DataKey::ApprovedForAll(collection_id, owner.clone(), operator.clone()), &approved);
    }
    
    fn get_royalty_info(env: &Env, collection_id: u64) -> Option<RoyaltyInfo> {
        env.storage()
            .instance()
            .get(&DataKey::RoyaltyInfo(collection_id))
    }
    
    fn set_royalty_info(env: &Env, collection_id: u64, royalty: &RoyaltyInfo) {
        env.storage()
            .instance()
            .set(&DataKey::RoyaltyInfo(collection_id), royalty);
    }
    
    fn is_whitelisted_for_mint(env: &Env, collection_id: u64, address: &Address) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::WhitelistForMint(collection_id, address.clone()))
            .unwrap_or(false)
    }
    
    fn set_whitelisted_for_mint(env: &Env, collection_id: u64, address: &Address, whitelisted: bool) {
        env.storage()
            .instance()
            .set(&DataKey::WhitelistForMint(collection_id, address.clone()), &whitelisted);
    }
    
    fn is_collection_paused(env: &Env, collection_id: u64) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::IsPaused(collection_id))
            .unwrap_or(false)
    }
    
    fn set_collection_paused(env: &Env, collection_id: u64, paused: bool) {
        env.storage()
            .instance()
            .set(&DataKey::IsPaused(collection_id), &paused);
    }
}