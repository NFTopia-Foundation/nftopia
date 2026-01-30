use soroban_sdk::{Address, Env, Map, String, Vec};

use crate::{
    errors::Error,
    events::Event,
    storage::{DataKey, TokenMetadata, RoyaltyInfo},
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

        Event::TokenMinted(
            info.address.clone(),
            token_id,
            to.clone(),
            uri,
        )
        .emit(env);

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

        let collection = DataKey::get_collection_info(env, collection_id)?.address;

        Event::BatchMinted(
            collection,
            start_token_id,
            uris.len() as u32,
            to.clone(),
        )
        .emit(env);

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
        if DataKey::is_collection_paused(env, collection_id) {
            return Err(Error::MintingPaused);
        }

        let owner = DataKey::get_token_owner(env, collection_id, token_id)
            .ok_or(Error::TokenNotFound)?;

        if &owner != from {
            let approved = DataKey::get_approved(env, collection_id, token_id);
            if approved.as_ref() != Some(from)
                && !DataKey::get_approved_for_all(env, collection_id, &owner, from)
            {
                return Err(Error::NotTokenOwner);
            }
        }

        DataKey::set_token_owner(env, collection_id, token_id, to);
        DataKey::decrement_balance(env, collection_id, from);
        DataKey::increment_balance(env, collection_id, to);
        DataKey::remove_approved(env, collection_id, token_id);

        let collection = DataKey::get_collection_info(env, collection_id)?.address;

        Event::TokenTransferred(
            collection,
            token_id,
            from.clone(),
            to.clone(),
        )
        .emit(env);

        Ok(())
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

        let collection = DataKey::get_collection_info(env, collection_id)?.address;

        Event::BatchTransferred(
            collection,
            token_ids.clone(),
            from.clone(),
            to.clone(),
        )
        .emit(env);

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

        Event::TokenBurned(
            info.address,
            token_id,
            owner.clone(),
        )
        .emit(env);

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

        let royalty = RoyaltyInfo { recipient, percentage };
        DataKey::set_royalty_info(env, collection_id, &royalty);

        Event::RoyaltyUpdated(
            info.address,
            royalty.recipient.clone(),
            percentage,
        )
        .emit(env);

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

        Event::CollectionPaused(info.address, paused).emit(env);
        Ok(())
    }
}
