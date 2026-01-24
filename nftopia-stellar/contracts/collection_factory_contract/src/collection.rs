use soroban_sdk::{contracttype, Address, Env, Map, String, Vec};

use crate::{
    errors::Error,
    events::Event,
    storage::{DataKey, Storage, TokenMetadata, RoyaltyInfo},
};

pub struct Collection;

impl Collection {
    // Mint a new token
    pub fn mint(
        env: &Env,
        collection_id: u64,
        to: &Address,
        uri: String,
        attributes: Option<Map<String, String>>,
    ) -> Result<u32, Error> {
        // Check if collection is paused
        if DataKey::is_collection_paused(env, collection_id) {
            return Err(Error::MintingPaused);
        }
        
        // Get collection info
        let info = DataKey::get_collection_info(env, collection_id)?;
        
        // Check max supply
        if let Some(max_supply) = info.config.max_supply {
            if info.total_tokens >= max_supply {
                return Err(Error::MaxSupplyExceeded);
            }
        }
        
        // Check if public minting is allowed
        if !info.config.is_public_mint {
            // Check if address is whitelisted
            if !DataKey::is_whitelisted_for_mint(env, collection_id, to) {
                return Err(Error::WhitelistRequired);
            }
        }
        
        // Get next token ID
        let token_id = DataKey::get_next_token_id(env, collection_id);
        
        // Create token metadata
        let metadata = TokenMetadata {
            token_id,
            uri: uri.clone(),
            attributes: attributes.unwrap_or(Map::new(env)),
            creator: to.clone(),
            created_at: env.ledger().timestamp(),
            updated_at: None,
        };
        
        // Set token owner
        DataKey::set_token_owner(env, collection_id, token_id, to);
        
        // Set token metadata
        DataKey::set_token_metadata(env, collection_id, token_id, &metadata);
        
        // Update balance
        DataKey::increment_balance(env, collection_id, to);
        
        // Increment token ID for next mint
        DataKey::increment_token_id(env, collection_id);
        
        // Update collection total tokens
        let mut info = info;
        info.total_tokens += 1;
        DataKey::set_collection_info(env, collection_id, &info);
        
        // Publish event
        Event::TokenMinted {
            collection: info.address,
            token_id,
            owner: to.clone(),
            uri,
        }
        .publish(env);
        
        Ok(token_id)
    }
    
    // Batch mint tokens
    pub fn batch_mint(
        env: &Env,
        collection_id: u64,
        to: &Address,
        uris: Vec<String>,
        attributes_list: Option<Vec<Map<String, String>>>,
    ) -> Result<Vec<u32>, Error> {
        let count = uris.len();
        let start_token_id = DataKey::get_next_token_id(env, collection_id);
        let mut token_ids = Vec::new(env);
        
        for i in 0..count {
            let uri = uris.get(i).unwrap();
            let attributes = attributes_list
                .as_ref()
                .and_then(|list| list.get(i));
            
            let token_id = Self::mint(
                env,
                collection_id,
                to,
                uri.clone(),
                attributes.cloned(),
            )?;
            
            token_ids.push_back(token_id);
        }
        
        // Publish batch event
        Event::BatchMinted {
            collection: DataKey::get_collection_info(env, collection_id)?.address,
            start_token_id,
            count: count as u32,
            owner: to.clone(),
        }
        .publish(env);
        
        Ok(token_ids)
    }
    
    // Transfer token
    pub fn transfer(
        env: &Env,
        collection_id: u64,
        from: &Address,
        to: &Address,
        token_id: u32,
    ) -> Result<(), Error> {
        // Check if collection is paused
        if DataKey::is_collection_paused(env, collection_id) {
            return Err(Error::MintingPaused);
        }
        
        // Check if token exists
        let owner = DataKey::get_token_owner(env, collection_id, token_id)
            .ok_or(Error::TokenNotFound)?;
        
        // Check if sender is owner or approved
        if &owner != from {
            // Check if approved for this specific token
            let approved = DataKey::get_approved(env, collection_id, token_id);
            if approved.as_ref() != Some(from) {
                // Check if approved for all
                if !DataKey::get_approved_for_all(env, collection_id, &owner, from) {
                    return Err(Error::NotTokenOwner);
                }
            }
        }
        
        // Calculate royalty if applicable
        if let Some(royalty_info) = DataKey::get_royalty_info(env, collection_id) {
            // In a real implementation, you would handle royalty payment here
            // For now, we just emit an event
            // Royalty would be enforced at the marketplace level
        }
        
        // Transfer ownership
        DataKey::set_token_owner(env, collection_id, token_id, to);
        
        // Update balances
        DataKey::decrement_balance(env, collection_id, from);
        DataKey::increment_balance(env, collection_id, to);
        
        // Clear approval for this token
        DataKey::remove_approved(env, collection_id, token_id);
        
        // Publish event
        Event::TokenTransferred {
            collection: DataKey::get_collection_info(env, collection_id)?.address,
            token_id,
            from: from.clone(),
            to: to.clone(),
        }
        .publish(env);
        
        Ok(())
    }
    
    // Batch transfer tokens
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
        
        // Publish batch event
        Event::BatchTransferred {
            collection: DataKey::get_collection_info(env, collection_id)?.address,
            token_ids: token_ids.clone(),
            from: from.clone(),
            to: to.clone(),
        }
        .publish(env);
        
        Ok(())
    }
    
    // Burn token
    pub fn burn(
        env: &Env,
        collection_id: u64,
        owner: &Address,
        token_id: u32,
    ) -> Result<(), Error> {
        // Check if token exists and owner matches
        let token_owner = DataKey::get_token_owner(env, collection_id, token_id)
            .ok_or(Error::TokenNotFound)?;
        
        if &token_owner != owner {
            return Err(Error::NotTokenOwner);
        }
        
        // Remove token data
        DataKey::remove_token_owner(env, collection_id, token_id);
        DataKey::remove_approved(env, collection_id, token_id);
        
        // Update balance
        DataKey::decrement_balance(env, collection_id, owner);
        
        // Update collection total tokens
        let mut info = DataKey::get_collection_info(env, collection_id)?;
        info.total_tokens = info.total_tokens.saturating_sub(1);
        DataKey::set_collection_info(env, collection_id, &info);
        
        // Publish event
        Event::TokenBurned {
            collection: info.address,
            token_id,
            owner: owner.clone(),
        }
        .publish(env);
        
        Ok(())
    }
    
    // Set approval for token
    pub fn approve(
        env: &Env,
        collection_id: u64,
        owner: &Address,
        approved: &Address,
        token_id: u32,
    ) -> Result<(), Error> {
        // Check if token exists and owner matches
        let token_owner = DataKey::get_token_owner(env, collection_id, token_id)
            .ok_or(Error::TokenNotFound)?;
        
        if &token_owner != owner {
            return Err(Error::NotTokenOwner);
        }
        
        DataKey::set_approved(env, collection_id, token_id, approved);
        Ok(())
    }
    
    // Set approval for all
    pub fn set_approval_for_all(
        env: &Env,
        collection_id: u64,
        owner: &Address,
        operator: &Address,
        approved: bool,
    ) -> Result<(), Error> {
        DataKey::set_approved_for_all(env, collection_id, owner, operator, approved);
        Ok(())
    }
    
    // Set royalty info (only collection owner can call)
    pub fn set_royalty_info(
        env: &Env,
        collection_id: u64,
        caller: &Address,
        recipient: Address,
        percentage: u32,
    ) -> Result<(), Error> {
        // Validate percentage (max 25% = 2500 basis points)
        if percentage > 2500 {
            return Err(Error::InvalidRoyaltyPercentage);
        }
        
        // Check if caller is collection creator
        let info = DataKey::get_collection_info(env, collection_id)?;
        if &info.creator != caller {
            return Err(Error::Unauthorized);
        }
        
        let royalty = RoyaltyInfo {
            recipient,
            percentage,
        };
        
        DataKey::set_royalty_info(env, collection_id, &royalty);
        
        // Publish event
        Event::RoyaltyUpdated {
            collection: info.address,
            recipient: royalty.recipient.clone(),
            percentage,
        }
        .publish(env);
        
        Ok(())
    }
    
    // Whitelist address for minting
    pub fn set_whitelist(
        env: &Env,
        collection_id: u64,
        caller: &Address,
        address: Address,
        whitelisted: bool,
    ) -> Result<(), Error> {
        // Check if caller is collection creator
        let info = DataKey::get_collection_info(env, collection_id)?;
        if &info.creator != caller {
            return Err(Error::Unauthorized);
        }
        
        DataKey::set_whitelisted_for_mint(env, collection_id, &address, whitelisted);
        
        // Publish event
        Event::WhitelistUpdated {
            collection: info.address,
            address: address.clone(),
            added: whitelisted,
        }
        .publish(env);
        
        Ok(())
    }
    
    // Pause/unpause collection
    pub fn set_paused(
        env: &Env,
        collection_id: u64,
        caller: &Address,
        paused: bool,
    ) -> Result<(), Error> {
        // Check if collection is pausable
        let info = DataKey::get_collection_info(env, collection_id)?;
        if !info.config.is_pausable {
            return Err(Error::Unauthorized);
        }
        
        // Check if caller is collection creator
        if &info.creator != caller {
            return Err(Error::Unauthorized);
        }
        
        DataKey::set_collection_paused(env, collection_id, paused);
        
        // Publish event
        Event::CollectionPaused {
            collection: info.address,
            paused,
        }
        .publish(env);
        
        Ok(())
    }
    
    // Query functions
    pub fn balance_of(
        env: &Env,
        collection_id: u64,
        address: &Address,
    ) -> Result<u32, Error> {
        Ok(DataKey::get_balance(env, collection_id, address))
    }
    
    pub fn owner_of(
        env: &Env,
        collection_id: u64,
        token_id: u32,
    ) -> Result<Address, Error> {
        DataKey::get_token_owner(env, collection_id, token_id)
            .ok_or(Error::TokenNotFound)
    }
    
    pub fn get_approved(
        env: &Env,
        collection_id: u64,
        token_id: u32,
    ) -> Result<Option<Address>, Error> {
        Ok(DataKey::get_approved(env, collection_id, token_id))
    }
    
    pub fn is_approved_for_all(
        env: &Env,
        collection_id: u64,
        owner: &Address,
        operator: &Address,
    ) -> Result<bool, Error> {
        Ok(DataKey::get_approved_for_all(env, collection_id, owner, operator))
    }
    
    pub fn token_uri(
        env: &Env,
        collection_id: u64,
        token_id: u32,
    ) -> Result<String, Error> {
        let metadata = DataKey::get_token_metadata(env, collection_id, token_id)
            .ok_or(Error::TokenNotFound)?;
        Ok(metadata.uri)
    }
    
    pub fn token_metadata(
        env: &Env,
        collection_id: u64,
        token_id: u32,
    ) -> Result<TokenMetadata, Error> {
        DataKey::get_token_metadata(env, collection_id, token_id)
            .ok_or(Error::TokenNotFound)
    }
    
    pub fn total_supply(
        env: &Env,
        collection_id: u64,
    ) -> Result<u32, Error> {
        let info = DataKey::get_collection_info(env, collection_id)?;
        Ok(info.total_tokens)
    }
    
    pub fn royalty_info(
        env: &Env,
        collection_id: u64,
    ) -> Result<Option<RoyaltyInfo>, Error> {
        Ok(DataKey::get_royalty_info(env, collection_id))
    }
}