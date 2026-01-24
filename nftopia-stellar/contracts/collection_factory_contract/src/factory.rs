use soroban_sdk::{contracttype, Address, Env, Val, String, Vec};

use crate::{
    errors::Error,
    events::Event,
    storage::{DataKey, Storage, CollectionConfig, CollectionInfo, FactoryConfig},
};

pub struct Factory;

impl Factory {
    // Initialize factory
    pub fn initialize(env: &Env, owner: Address) -> Result<(), Error> {
        // Check if already initialized
        if DataKey::get_factory_config(env).is_ok() {
            return Err(Error::CollectionAlreadyExists);
        }
        
        let config = FactoryConfig {
            owner,
            factory_fee: 0, // No fee by default
            max_collections: None, // No limit by default
            total_collections: 0,
            accumulated_fees: 0,
            is_active: true,
        };
        
        DataKey::set_factory_config(env, &config);
        Ok(())
    }
    
    // Create new collection
    pub fn create_collection(
        env: &Env,
        caller: &Address,
        config: CollectionConfig,
        initial_royalty_recipient: Option<Address>,
    ) -> Result<u64, Error> {
        // Validate factory is active
        let factory_config = DataKey::get_factory_config(env)?;
        if !factory_config.is_active {
            return Err(Error::Unauthorized);
        }
        
        // Check collection limit
        if let Some(max) = factory_config.max_collections {
            if factory_config.total_collections >= max {
                return Err(Error::CollectionLimitReached);
            }
        }
        
        // Validate config
        Self::validate_collection_config(env, &config)?;
        
        // Check and collect fee if any
        if factory_config.factory_fee > 0 {
            // In Soroban, you would transfer tokens here
            // For simplicity, we'll assume the fee is paid via a separate mechanism
            // You would typically use the token contract to transfer from caller to factory
        }
        
        // Generate collection ID
        let collection_id = factory_config.total_collections as u64 + 1;
        
        // In a real implementation, you would deploy a new contract here
        // For this example, we'll simulate it by storing collection info
        let collection_address = Self::deploy_collection_contract(env, collection_id, caller, &config)?;
        
        // Create collection info
        let info = CollectionInfo {
            address: collection_address.clone(),
            creator: caller.clone(),
            config: config.clone(),
            created_at: env.ledger().timestamp(),
            total_tokens: 0,
            is_paused: false,
        };
        
        // Store collection info
        DataKey::set_collection_info(env, collection_id, &info);
        
        // Set initial royalty if provided
        if let Some(recipient) = initial_royalty_recipient {
            let royalty = crate::storage::RoyaltyInfo {
                recipient,
                percentage: config.royalty_percentage,
            };
            DataKey::set_royalty_info(env, collection_id, &royalty);
        }
        
        // Update factory config
        let mut factory_config = factory_config;
        factory_config.total_collections += 1;
        if factory_config.factory_fee > 0 {
            factory_config.accumulated_fees += factory_config.factory_fee;
        }
        DataKey::set_factory_config(env, &factory_config);
        
        // Publish event
        Event::CollectionCreated {
            creator: caller.clone(),
            collection_id,
            collection_address,
            name: config.name,
            symbol: config.symbol,
        }
        .publish(env);
        
        Ok(collection_id)
    }
    
    // Get collection count
    pub fn get_collection_count(env: &Env) -> Result<u32, Error> {
        let config = DataKey::get_factory_config(env)?;
        Ok(config.total_collections)
    }
    
    // Get collection address by ID
    pub fn get_collection_address(env: &Env, collection_id: u64) -> Result<Address, Error> {
        let info = DataKey::get_collection_info(env, collection_id)?;
        Ok(info.address)
    }
    
    // Get collection info by ID
    pub fn get_collection_info(env: &Env, collection_id: u64) -> Result<CollectionInfo, Error> {
        DataKey::get_collection_info(env, collection_id)
    }
    
    // Set factory fee (only owner)
    pub fn set_factory_fee(
        env: &Env,
        caller: &Address,
        fee: i128,
    ) -> Result<(), Error> {
        let mut config = DataKey::get_factory_config(env)?;
        
        // Check if caller is owner
        if &config.owner != caller {
            return Err(Error::Unauthorized);
        }
        
        let old_fee = config.factory_fee;
        config.factory_fee = fee;
        DataKey::set_factory_config(env, &config);
        
        // Publish event
        Event::FactoryFeeUpdated {
            old_fee,
            new_fee: fee,
            updater: caller.clone(),
        }
        .publish(env);
        
        Ok(())
    }
    
    // Withdraw accumulated fees (only owner)
    pub fn withdraw_fees(
        env: &Env,
        caller: &Address,
        recipient: Address,
        amount: i128,
    ) -> Result<(), Error> {
        let mut config = DataKey::get_factory_config(env)?;
        
        // Check if caller is owner
        if &config.owner != caller {
            return Err(Error::Unauthorized);
        }
        
        // Check if sufficient balance
        if config.accumulated_fees < amount {
            return Err(Error::InsufficientFee);
        }
        
        config.accumulated_fees -= amount;
        DataKey::set_factory_config(env, &config);
        
        // In a real implementation, you would transfer tokens here
        // For simplicity, we'll just emit an event
        
        // Publish event
        Event::FeesWithdrawn {
            recipient,
            amount,
        }
        .publish(env);
        
        Ok(())
    }
    
    // Set max collections (only owner)
    pub fn set_max_collections(
        env: &Env,
        caller: &Address,
        max: Option<u32>,
    ) -> Result<(), Error> {
        let mut config = DataKey::get_factory_config(env)?;
        
        // Check if caller is owner
        if &config.owner != caller {
            return Err(Error::Unauthorized);
        }
        
        config.max_collections = max;
        DataKey::set_factory_config(env, &config);
        
        Ok(())
    }
    
    // Set factory active/inactive (only owner)
    pub fn set_factory_active(
        env: &Env,
        caller: &Address,
        active: bool,
    ) -> Result<(), Error> {
        let mut config = DataKey::get_factory_config(env)?;
        
        // Check if caller is owner
        if &config.owner != caller {
            return Err(Error::Unauthorized);
        }
        
        config.is_active = active;
        DataKey::set_factory_config(env, &config);
        
        Ok(())
    }
    
    // Validate collection config
    fn validate_collection_config(
        env: &Env,
        config: &CollectionConfig,
    ) -> Result<(), Error> {
        // Check name is not empty
        if config.name.len() == 0 {
            return Err(Error::InvalidConfig);
        }
        
        // Check symbol is not empty
        if config.symbol.len() == 0 {
            return Err(Error::InvalidConfig);
        }
        
        // Check royalty percentage is valid (max 25%)
        if config.royalty_percentage > 2500 {
            return Err(Error::InvalidRoyaltyPercentage);
        }
        
        // Validate max supply if provided
        if let Some(max_supply) = config.max_supply {
            if max_supply == 0 {
                return Err(Error::InvalidConfig);
            }
        }
        
        Ok(())
    }
    
    // Deploy collection contract (simulated)
    fn deploy_collection_contract(
        env: &Env,
        collection_id: u64,
        creator: &Address,
        config: &CollectionConfig,
    ) -> Result<Address, Error> {
        // In a real Soroban implementation, you would:
        // 1. Deploy a new contract instance
        // 2. Initialize it with the collection config
        // 3. Return the contract address
        
        // For this example, we'll generate a simulated address
        // based on collection ID and creator
        let address_data = env.crypto().sha256(
            &(collection_id.to_be_bytes().to_vec(), creator.to_string()).into_val(env)
        );
        
        // Convert hash to address (simplified)
        // In reality, you'd use the actual deployed contract address
        Ok(Address::from_contract_id(&env.crypto().sha256(&address_data)))
    }
}