use soroban_sdk::{Env, String};

use crate::access_control::require_owner;
use crate::error::ContractError;
use crate::events;
use crate::storage;

pub fn token_uri(env: &Env, token_id: u64) -> Result<String, ContractError> {
    let token = storage::read_token(env, token_id)?;
    let config = storage::read_config(env)?;
    if config.is_revealed || is_reveal_ready(env, &config) {
        Ok(token.metadata_uri)
    } else {
        Ok(config.base_uri)
    }
}

pub fn token_metadata(env: &Env, token_id: u64) -> Result<crate::token::TokenData, ContractError> {
    storage::read_token(env, token_id)
}

pub fn set_token_uri(
    env: &Env,
    token_id: u64,
    uri: String,
) -> Result<(), ContractError> {
    let config = storage::read_config(env)?;
    if config.metadata_is_frozen {
        return Err(ContractError::MetadataFrozen);
    }

    let mut token = storage::read_token(env, token_id)?;
    token.owner.require_auth();

    token.metadata_uri = uri.clone();
    storage::write_token(env, &token);
    events::emit_metadata_update(env, token_id, &uri);
    Ok(())
}

pub fn set_base_uri(env: &Env, uri: String) -> Result<(), ContractError> {
    let _ = require_owner(env)?;
    let mut config = storage::read_config(env)?;
    if config.metadata_is_frozen {
        return Err(ContractError::MetadataFrozen);
    }
    config.base_uri = uri.clone();
    storage::write_config(env, &config);
    events::emit_base_uri_update(env, &uri);
    Ok(())
}

pub fn freeze_metadata(env: &Env) -> Result<(), ContractError> {
    let _ = require_owner(env)?;
    let mut config = storage::read_config(env)?;
    if config.metadata_is_frozen {
        return Ok(());
    }
    config.metadata_is_frozen = true;
    storage::write_config(env, &config);
    Ok(())
}

pub fn set_reveal_time(env: &Env, reveal_time: Option<u64>) -> Result<(), ContractError> {
    let _ = require_owner(env)?;
    let mut config = storage::read_config(env)?;
    config.reveal_time = reveal_time;
    storage::write_config(env, &config);
    Ok(())
}

pub fn set_revealed(env: &Env, revealed: bool) -> Result<(), ContractError> {
    let _ = require_owner(env)?;
    let mut config = storage::read_config(env)?;
    if revealed && !is_reveal_ready(env, &config) {
        return Err(ContractError::RevealNotReady);
    }
    config.is_revealed = revealed;
    storage::write_config(env, &config);
    Ok(())
}

fn is_reveal_ready(env: &Env, config: &crate::token::CollectionConfig) -> bool {
    if let Some(reveal_time) = config.reveal_time {
        env.ledger().timestamp() >= reveal_time
    } else {
        true
    }
}
