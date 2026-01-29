use soroban_sdk::{Address, Env, String};

use crate::access_control::{has_role, Role};
use crate::error::ContractError;
use crate::storage::{get_collection_config, get_token, set_collection_config, set_token};
use crate::token::TokenData;

pub fn metadata_locked(env: &Env) -> Result<bool, ContractError> {
    Ok(get_collection_config(env)?.metadata_is_frozen)
}

pub fn require_metadata_updater(env: &Env, token_id: u64) -> Result<(), ContractError> {
    let token = get_token(env, token_id)?;
    let invoker = env.invoker();
    invoker.require_auth();

    if invoker == token.owner
        || has_role(env, Role::Admin, &invoker)
        || has_role(env, Role::MetadataUpdater, &invoker)
    {
        return Ok(());
    }

    Err(ContractError::Unauthorized)
}

pub fn token_uri(env: &Env, token_id: u64) -> Result<String, ContractError> {
    let token = get_token(env, token_id)?;
    let config = get_collection_config(env)?;

    if !config.is_revealed && config.base_uri.len() > 0 {
        return Ok(config.base_uri);
    }

    if token.metadata_uri.len() == 0 {
        return Ok(config.base_uri);
    }

    Ok(token.metadata_uri)
}

pub fn token_metadata(env: &Env, token_id: u64) -> Result<TokenData, ContractError> {
    get_token(env, token_id)
}

pub fn set_token_uri(env: &Env, token_id: u64, uri: String) -> Result<(), ContractError> {
    let mut token = get_token(env, token_id)?;
    let config = get_collection_config(env)?;

    if config.metadata_is_frozen {
        return Err(ContractError::MetadataFrozen);
    }

    token.metadata_uri = uri;
    set_token(env, token_id, token);

    Ok(())
}

pub fn set_base_uri(env: &Env, uri: String) -> Result<(), ContractError> {
    let mut config = get_collection_config(env)?;
    config.base_uri = uri;
    set_collection_config(env, config);
    Ok(())
}
