use soroban_sdk::{Address, Env, Map, String, Vec, symbol_short};

use crate::{
    errors::Error,
    storage::{DataKey, TokenMetadata, RoyaltyInfo},
};

pub struct Collection;

impl Collection {
    // ERC721-like methods
    pub fn balance_of(env: &Env, collection_id: u64, address: &Address) -> u32 {
        DataKey::get_balance(env, collection_id, address)
    }
    
    pub fn owner_of(env: &Env, collection_id: u64, token_id: u32) -> Result<Address, Error> {
        DataKey::get_token_owner(env, collection_id, token_id)
            .ok_or(Error::TokenNotFound)
    }
    
    pub fn get_approved(env: &Env, collection_id: u64, token_id: u32) -> Option<Address> {
        DataKey::get_approved(env, collection_id, token_id)
    }
    
    pub fn is_approved_for_all(env: &Env, collection_id: u64, owner: &Address, operator: &Address) -> bool {
        DataKey::get_approved_for_all(env, collection_id, owner, operator)
    }
    
    pub fn approve(env: &Env, collection_id: u64, caller: &Address, approved: &Address, token_id: u32) -> Result<(), Error> {
        let owner = Self::owner_of(env, collection_id, token_id)?;
        
        // Check if caller is owner or approved for all
        if &owner != caller && !Self::is_approved_for_all(env, collection_id, &owner, caller) {
            return Err(Error::NotTokenOwner);
        }
        
        DataKey::set_approved(env, collection_id, token_id, approved);
        
        // Emit approval event
        env.events().publish(
            (symbol_short!("approved"), collection_id),
            (caller.clone(), approved.clone(), token_id)
        );
        
        Ok(())
    }
    
    pub fn set_approval_for_all(env: &Env, collection_id: u64, owner: &Address, operator: &Address, approved: bool) -> Result<(), Error> {
        DataKey::set_approved_for_all(env, collection_id, owner, operator, approved);
        
        // Emit approval for all event
        env.events().publish(
            (symbol_short!("approval_for_all"), collection_id),
            (owner.clone(), operator.clone(), approved)
        );
        
        Ok(())
    }
    
    pub fn transfer_from(
        env: &Env,
        collection_id: u64,
        caller: &Address,
        from: &Address,
        to: &Address,
        token_id: u32,
    ) -> Result<(), Error> {
        // Check ownership or approval
        let owner = Self::owner_of(env, collection_id, token_id)?;
        if &owner != from {
            return Err(Error::NotTokenOwner);
        }
        
        let approved = Self::get_approved(env, collection_id, token_id);
        if caller != from && approved.as_ref() != Some(caller) 
            && !Self::is_approved_for_all(env, collection_id, from, caller) {
            return Err(Error::NotApproved);
        }
        
        // Perform transfer
        DataKey::set_token_owner(env, collection_id, token_id, to);
        DataKey::decrement_balance(env, collection_id, from);
        DataKey::increment_balance(env, collection_id, to);
        DataKey::remove_approved(env, collection_id, token_id);
        
        // Emit event with symbol_short for efficiency
        let collection_info = DataKey::get_collection_info(env, collection_id)?;
        env.events().publish(
            (symbol_short!("token_transferred"), collection_id),
            (collection_info.address, token_id, from.clone(), to.clone())
        );
        
        Ok(())
    }
    
    // Set whitelist
    pub fn set_whitelist(
        env: &Env,
        collection_id: u64,
        caller: &Address,
        address: &Address,
        whitelisted: bool,
    ) -> Result<(), Error> {
        let info = DataKey::get_collection_info(env, collection_id)?;
        if &info.creator != caller {
            return Err(Error::Unauthorized);
        }
        
        DataKey::set_whitelisted_for_mint(env, collection_id, address, whitelisted);
        
        // Emit event with symbol_short
        env.events().publish(
            (symbol_short!("whitelist_updated"), collection_id),
            (info.address, address.clone(), whitelisted)
        );
        
        Ok(())
    }
    
    // Token URI
    pub fn token_uri(env: &Env, collection_id: u64, token_id: u32) -> Result<String, Error> {
        let metadata = DataKey::get_token_metadata(env, collection_id, token_id)
            .ok_or(Error::TokenNotFound)?;
        Ok(metadata.uri)
    }
    
    // Token metadata
    pub fn token_metadata(env: &Env, collection_id: u64, token_id: u32) -> Result<TokenMetadata, Error> {
        DataKey::get_token_metadata(env, collection_id, token_id)
            .ok_or(Error::TokenNotFound)
    }
    
    // Total supply
    pub fn total_supply(env: &Env, collection_id: u64) -> Result<u32, Error> {
        let info = DataKey::get_collection_info(env, collection_id)?;
        Ok(info.total_tokens)
    }
    
    // Royalty info
    pub fn royalty_info(env: &Env, collection_id: u64) -> Option<RoyaltyInfo> {
        DataKey::get_royalty_info(env, collection_id)
    }

    // Mint a new token
    pub fn mint(
        env: &Env,
        collection_id: u64,
        to: &Address,
        uri: String,
        attributes: Option<Map<String, String>>,
    ) -> Result<u32, Error> {
        if DataKey::is_collection_paused(env, collection_id) {
            return Err(Error::MintingPaused);
        }

        let mut info = DataKey::get_collection_info(env, collection_id)?;

        if let Some(max_supply) = info.config.max_supply {
            if info.total_tokens >= max_supply {
                return Err(Error::MaxSupplyExceeded);
            }
        }

        if !info.config.is_public_mint
            && !DataKey::is_whitelisted_for_mint(env, collection_id, to)
        {
            return Err(Error::WhitelistRequired);
        }

        let token_id = DataKey::get_next_token_id(env, collection_id);

        let metadata = TokenMetadata {
            token_id,
            uri: uri.clone(),
            attributes: attributes.unwrap_or_else(|| Map::new(env)),
            creator: to.clone(),
            created_at: env.ledger().timestamp(),
            updated_at: None,
        };

        DataKey::set_token_owner(env, collection_id, token_id, to);
        DataKey::set_token_metadata(env, collection_id, token_id, &metadata);
        DataKey::increment_balance(env, collection_id, to);
        DataKey::increment_token_id(env, collection_id);

        info.total_tokens += 1;
        DataKey::set_collection_info(env, collection_id, &info);

        // Emit event using symbol_short for efficiency
        env.events().publish(
            (symbol_short!("token_minted"), collection_id),
            (info.address.clone(), token_id, to.clone(), uri)
        );

        Ok(token_id)
    }

    // Batch mint
    pub fn batch_mint(
        env: &Env,
        collection_id: u64,
        to: &Address,
        uris: Vec<String>,
        attributes_list: Option<Vec<Map<String, String>>>,
    ) -> Result<Vec<u32>, Error> {
        let start_token_id = DataKey::get_next_token_id(env, collection_id);
        let mut token_ids = Vec::new(env);

        for i in 0..uris.len() {
            let uri = uris.get(i).unwrap();
            let attrs = attributes_list
                .as_ref()
                .and_then(|v| v.get(i))
                .map(|m| m.clone());

            let token_id = Self::mint(env, collection_id, to, uri.clone(), attrs)?;
            token_ids.push_back(token_id);
        }

        let collection_info = DataKey::get_collection_info(env, collection_id)?;

        // Emit event with symbol_short
        env.events().publish(
            (symbol_short!("batch_minted"), collection_id),
            (collection_info.address, start_token_id, uris.len() as u32, to.clone())
        );

        Ok(token_ids)
    }

    // Transfer token (simplified version)
    pub fn transfer(
        env: &Env,
        collection_id: u64,
        from: &Address,
        to: &Address,
        token_id: u32,
    ) -> Result<(), Error> {
        Self::transfer_from(env, collection_id, from, from, to, token_id)
    }

    // Batch transfer
    pub fn batch_transfer(
        env: &Env,
        collection_id: u64,
        from: &Address,
        to: &Address,
        token_ids: Vec<u32>,
    ) -> Result<(), Error> {
        for token_id in token_ids.iter() {
            Self::transfer(env, collection_id, from, to, *token_id)?;
        }

        let collection_info = DataKey::get_collection_info(env, collection_id)?;

        // Emit event with symbol_short
        env.events().publish(
            (symbol_short!("batch_transferred"), collection_id),
            (collection_info.address, token_ids.clone(), from.clone(), to.clone())
        );

        Ok(())
    }

    // Burn token
    pub fn burn(
        env: &Env,
        collection_id: u64,
        owner: &Address,
        token_id: u32,
    ) -> Result<(), Error> {
        let token_owner = DataKey::get_token_owner(env, collection_id, token_id)
            .ok_or(Error::TokenNotFound)?;

        if &token_owner != owner {
            return Err(Error::NotTokenOwner);
        }

        DataKey::remove_token_owner(env, collection_id, token_id);
        DataKey::remove_approved(env, collection_id, token_id);
        DataKey::decrement_balance(env, collection_id, owner);

        let mut info = DataKey::get_collection_info(env, collection_id)?;
        info.total_tokens = info.total_tokens.saturating_sub(1);
        DataKey::set_collection_info(env, collection_id, &info);

        // Emit event with symbol_short
        env.events().publish(
            (symbol_short!("token_burned"), collection_id),
            (info.address, token_id, owner.clone())
        );

        Ok(())
    }

    // Royalty
    pub fn set_royalty_info(
        env: &Env,
        collection_id: u64,
        caller: &Address,
        recipient: Address,
        percentage: u32,
    ) -> Result<(), Error> {
        if percentage > 2500 {
            return Err(Error::InvalidRoyaltyPercentage);
        }

        let info = DataKey::get_collection_info(env, collection_id)?;
        if &info.creator != caller {
            return Err(Error::Unauthorized);
        }

        let royalty = RoyaltyInfo { recipient: recipient.clone(), percentage };
        DataKey::set_royalty_info(env, collection_id, &royalty);

        // Emit event with symbol_short
        env.events().publish(
            (symbol_short!("royalty_updated"), collection_id),
            (info.address, recipient, percentage)
        );

        Ok(())
    }

    // Pause
    pub fn set_paused(
        env: &Env,
        collection_id: u64,
        caller: &Address,
        paused: bool,
    ) -> Result<(), Error> {
        let info = DataKey::get_collection_info(env, collection_id)?;

        if !info.config.is_pausable || &info.creator != caller {
            return Err(Error::Unauthorized);
        }

        DataKey::set_collection_paused(env, collection_id, paused);

        // Emit event with symbol_short
        env.events().publish(
            (symbol_short!("collection_paused"), collection_id),
            (info.address, paused)
        );
        
        Ok(())
    }
}