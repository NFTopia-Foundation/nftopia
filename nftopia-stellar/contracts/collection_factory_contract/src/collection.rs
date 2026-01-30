use soroban_sdk::{Address, Env, Map, String, Vec, symbol_short};

use crate::{
    errors::Error,
    storage::{DataKey, Storage, TokenMetadata, RoyaltyInfo},
};

pub struct Collection;

impl Collection {
    // ERC721-like methods
    pub fn balance_of(env: &Env, collection_id: u64, address: &Address) -> u32 {
        <DataKey as Storage>::get_balance(env, collection_id, address)
    }
    
    pub fn owner_of(env: &Env, collection_id: u64, token_id: u32) -> Result<Address, Error> {
        <DataKey as Storage>::get_token_owner(env, collection_id, token_id)
            .ok_or(Error::TokenNotFound)
    }
    
    pub fn get_approved(env: &Env, collection_id: u64, token_id: u32) -> Option<Address> {
        <DataKey as Storage>::get_approved(env, collection_id, token_id)
    }
    
    pub fn is_approved_for_all(env: &Env, collection_id: u64, owner: &Address, operator: &Address) -> bool {
        <DataKey as Storage>::get_approved_for_all(env, collection_id, owner, operator)
    }
    
    pub fn approve(env: &Env, collection_id: u64, caller: &Address, approved: &Address, token_id: u32) -> Result<(), Error> {
        let owner = Self::owner_of(env, collection_id, token_id)?;
        
        // Check if caller is owner or approved for all
        if &owner != caller && !Self::is_approved_for_all(env, collection_id, &owner, caller) {
            return Err(Error::NotTokenOwner);
        }
        
        <DataKey as Storage>::set_approved(env, collection_id, token_id, approved);
        Ok(())
    }
    
    pub fn set_approval_for_all(env: &Env, collection_id: u64, owner: &Address, operator: &Address, approved: bool) -> Result<(), Error> {
        <DataKey as Storage>::set_approved_for_all(env, collection_id, owner, operator, approved);
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
        <DataKey as Storage>::set_token_owner(env, collection_id, token_id, to);
        <DataKey as Storage>::decrement_balance(env, collection_id, from);
        <DataKey as Storage>::increment_balance(env, collection_id, to);
        <DataKey as Storage>::remove_approved(env, collection_id, token_id);
        
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
        let info = <DataKey as Storage>::get_collection_info(env, collection_id)?;
        if &info.creator != caller {
            return Err(Error::Unauthorized);
        }
        
        <DataKey as Storage>::set_whitelisted_for_mint(env, collection_id, address, whitelisted);
        
        Ok(())
    }
    
    // Token URI
    pub fn token_uri(env: &Env, collection_id: u64, token_id: u32) -> Result<String, Error> {
        let metadata = <DataKey as Storage>::get_token_metadata(env, collection_id, token_id)
            .ok_or(Error::TokenNotFound)?;
        Ok(metadata.uri)
    }
    
    // Token metadata
    pub fn token_metadata(env: &Env, collection_id: u64, token_id: u32) -> Result<TokenMetadata, Error> {
        <DataKey as Storage>::get_token_metadata(env, collection_id, token_id)
            .ok_or(Error::TokenNotFound)
    }
    
    // Total supply
    pub fn total_supply(env: &Env, collection_id: u64) -> Result<u32, Error> {
        let info = <DataKey as Storage>::get_collection_info(env, collection_id)?;
        Ok(info.total_tokens)
    }
    
    // Royalty info
    pub fn royalty_info(env: &Env, collection_id: u64) -> Option<RoyaltyInfo> {
        <DataKey as Storage>::get_royalty_info(env, collection_id)
    }

    // Mint a new token
    pub fn mint(
        env: &Env,
        collection_id: u64,
        to: &Address,
        uri: String,
        attributes: Option<Map<String, String>>,
    ) -> Result<u32, Error> {
        if <DataKey as Storage>::is_collection_paused(env, collection_id) {
            return Err(Error::MintingPaused);
        }

        let mut info = <DataKey as Storage>::get_collection_info(env, collection_id)?;

        if let Some(max_supply) = info.config.max_supply {
            if info.total_tokens >= max_supply {
                return Err(Error::MaxSupplyExceeded);
            }
        }

        if !info.config.is_public_mint
            && !<DataKey as Storage>::is_whitelisted_for_mint(env, collection_id, to)
        {
            return Err(Error::WhitelistRequired);
        }

        let token_id = <DataKey as Storage>::get_next_token_id(env, collection_id);

        let metadata = TokenMetadata {
            token_id,
            uri: uri.clone(),
            attributes: attributes.unwrap_or_else(|| Map::new(env)),
            creator: to.clone(),
            created_at: env.ledger().timestamp(),
            updated_at: None,
        };

        <DataKey as Storage>::set_token_owner(env, collection_id, token_id, to);
        <DataKey as Storage>::set_token_metadata(env, collection_id, token_id, &metadata);
        <DataKey as Storage>::increment_balance(env, collection_id, to);
        <DataKey as Storage>::increment_token_id(env, collection_id);

        info.total_tokens += 1;
        <DataKey as Storage>::set_collection_info(env, collection_id, &info);

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
        let start_token_id = <DataKey as Storage>::get_next_token_id(env, collection_id);
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

    // Batch transfer - FIXED dereferencing issue
    pub fn batch_transfer(
        env: &Env,
        collection_id: u64,
        from: &Address,
        to: &Address,
        token_ids: Vec<u32>,
    ) -> Result<(), Error> {
        for &token_id in token_ids.iter() {  // Use &token_id instead of *token_id
            Self::transfer(env, collection_id, from, to, token_id)?;
        }
        Ok(())
    }

    // Burn token
    pub fn burn(
        env: &Env,
        collection_id: u64,
        owner: &Address,
        token_id: u32,
    ) -> Result<(), Error> {
        let token_owner = <DataKey as Storage>::get_token_owner(env, collection_id, token_id)
            .ok_or(Error::TokenNotFound)?;

        if &token_owner != owner {
            return Err(Error::NotTokenOwner);
        }

        <DataKey as Storage>::remove_token_owner(env, collection_id, token_id);
        <DataKey as Storage>::remove_approved(env, collection_id, token_id);
        <DataKey as Storage>::decrement_balance(env, collection_id, owner);

        let mut info = <DataKey as Storage>::get_collection_info(env, collection_id)?;
        info.total_tokens = info.total_tokens.saturating_sub(1);
        <DataKey as Storage>::set_collection_info(env, collection_id, &info);

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

        let info = <DataKey as Storage>::get_collection_info(env, collection_id)?;
        if &info.creator != caller {
            return Err(Error::Unauthorized);
        }

        let royalty = RoyaltyInfo { recipient: recipient.clone(), percentage };
        <DataKey as Storage>::set_royalty_info(env, collection_id, &royalty);

        Ok(())
    }

    // Pause
    pub fn set_paused(
        env: &Env,
        collection_id: u64,
        caller: &Address,
        paused: bool,
    ) -> Result<(), Error> {
        let info = <DataKey as Storage>::get_collection_info(env, collection_id)?;

        if !info.config.is_pausable || &info.creator != caller {
            return Err(Error::Unauthorized);
        }

        <DataKey as Storage>::set_collection_paused(env, collection_id, paused);
        
        Ok(())
    }
}