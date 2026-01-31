use soroban_sdk::{Address, Env};

use crate::{
    errors::Error,
    storage::{CollectionConfig, CollectionInfo, DataKey, FactoryConfig, Storage},
};

pub struct Factory;

impl Factory {
    // ─────────────────────────────────────────────
    // Initialize factory
    // ─────────────────────────────────────────────
    pub fn initialize(env: &Env, owner: Address) -> Result<(), Error> {
        if <DataKey as Storage>::get_factory_config(env).is_ok() {
            return Err(Error::AlreadyInitialized);
        }

        let config = FactoryConfig {
            owner,
            factory_fee: 0,
            max_collections: None,
            total_collections: 0,
            accumulated_fees: 0,
            is_active: true,
        };

        <DataKey as Storage>::set_factory_config(env, &config);
        Ok(())
    }

    // ─────────────────────────────────────────────
    // Create collection
    // ─────────────────────────────────────────────
    pub fn create_collection(
        env: &Env,
        caller: &Address,
        config: CollectionConfig,
        initial_royalty_recipient: Option<Address>,
    ) -> Result<u64, Error> {
        let mut factory_config = <DataKey as Storage>::get_factory_config(env)?;

        if !factory_config.is_active {
            return Err(Error::Unauthorized);
        }

        if let Some(max) = factory_config.max_collections {
            if factory_config.total_collections >= max {
                return Err(Error::CollectionLimitReached);
            }
        }

        Self::validate_collection_config(&config)?;

        let collection_id = factory_config.total_collections as u64 + 1;

        // All collections share the same contract address but different collection_id
        let collection_address = env.current_contract_address();

        let info = CollectionInfo {
            address: collection_address.clone(),
            creator: caller.clone(),
            config: config.clone(),
            created_at: env.ledger().timestamp(),
            total_tokens: 0,
            is_paused: false,
        };

        <DataKey as Storage>::set_collection_info(env, collection_id, &info);

        if let Some(recipient) = initial_royalty_recipient {
            let royalty = crate::storage::RoyaltyInfo {
                recipient,
                percentage: config.royalty_percentage,
            };
            <DataKey as Storage>::set_royalty_info(env, collection_id, &royalty);
        }

        factory_config.total_collections += 1;
        factory_config.accumulated_fees += factory_config.factory_fee;
        <DataKey as Storage>::set_factory_config(env, &factory_config);

        Ok(collection_id)
    }

    // ─────────────────────────────────────────────
    // Queries
    // ─────────────────────────────────────────────
    pub fn get_collection_count(env: &Env) -> Result<u32, Error> {
        Ok(<DataKey as Storage>::get_factory_config(env)?.total_collections)
    }

    pub fn get_collection_address(env: &Env, collection_id: u64) -> Result<Address, Error> {
        Ok(<DataKey as Storage>::get_collection_info(env, collection_id)?.address)
    }

    pub fn get_collection_info(env: &Env, collection_id: u64) -> Result<CollectionInfo, Error> {
        <DataKey as Storage>::get_collection_info(env, collection_id)
    }

    pub fn get_factory_config(env: &Env) -> Result<FactoryConfig, Error> {
        <DataKey as Storage>::get_factory_config(env)
    }

    // ─────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────
    pub fn set_factory_fee(env: &Env, caller: &Address, fee: i128) -> Result<(), Error> {
        let mut config = <DataKey as Storage>::get_factory_config(env)?;

        if &config.owner != caller {
            return Err(Error::Unauthorized);
        }

        let _old_fee = config.factory_fee;
        config.factory_fee = fee;
        <DataKey as Storage>::set_factory_config(env, &config);

        Ok(())
    }

    pub fn withdraw_fees(
        env: &Env,
        caller: &Address,
        _recipient: Address,
        amount: i128,
    ) -> Result<(), Error> {
        let mut config = <DataKey as Storage>::get_factory_config(env)?;

        if &config.owner != caller {
            return Err(Error::Unauthorized);
        }

        if config.accumulated_fees < amount {
            return Err(Error::InsufficientFee);
        }

        config.accumulated_fees -= amount;
        <DataKey as Storage>::set_factory_config(env, &config);

        Ok(())
    }

    pub fn set_max_collections(env: &Env, caller: &Address, max: Option<u32>) -> Result<(), Error> {
        let mut config = <DataKey as Storage>::get_factory_config(env)?;

        if &config.owner != caller {
            return Err(Error::Unauthorized);
        }

        config.max_collections = max;
        <DataKey as Storage>::set_factory_config(env, &config);
        Ok(())
    }

    pub fn set_factory_active(env: &Env, caller: &Address, active: bool) -> Result<(), Error> {
        let mut config = <DataKey as Storage>::get_factory_config(env)?;

        if &config.owner != caller {
            return Err(Error::Unauthorized);
        }

        config.is_active = active;
        <DataKey as Storage>::set_factory_config(env, &config);
        Ok(())
    }

    // ─────────────────────────────────────────────
    // Validation
    // ─────────────────────────────────────────────
    fn validate_collection_config(config: &CollectionConfig) -> Result<(), Error> {
        if config.name.is_empty() || config.symbol.is_empty() {
            return Err(Error::InvalidConfig);
        }

        if config.royalty_percentage > 2500 {
            // 25% max
            return Err(Error::InvalidRoyaltyPercentage);
        }

        if let Some(max_supply) = config.max_supply {
            if max_supply == 0 {
                return Err(Error::InvalidConfig);
            }
        }

        Ok(())
    }
}
