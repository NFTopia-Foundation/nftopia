use soroban_sdk::Env;

use crate::error::ContractError;
use crate::storage::{
    get_token, is_mint_paused, is_paused, is_reentrancy_active, is_transfer_paused, is_whitelisted,
    set_reentrancy, whitelist_enabled,
};

pub fn require_not_paused(env: &Env, minting: bool) -> Result<(), ContractError> {
    if is_paused(env) {
        return Err(ContractError::ContractPaused);
    }
    if minting && is_mint_paused(env) {
        return Err(ContractError::MintingPaused);
    }
    if !minting && is_transfer_paused(env) {
        return Err(ContractError::TransfersPaused);
    }
    Ok(())
}

pub fn validate_royalty_info(percentage: u32) -> Result<(), ContractError> {
    if percentage > 10_000 {
        return Err(ContractError::InvalidRoyaltyPercentage);
    }
    Ok(())
}

pub fn require_token_exists(env: &Env, token_id: u64) -> Result<(), ContractError> {
    get_token(env, token_id)?;
    Ok(())
}

pub fn require_whitelist(env: &Env, addr: &soroban_sdk::Address) -> Result<(), ContractError> {
    if !whitelist_enabled(env) {
        return Ok(());
    }
    if !is_whitelisted(env, addr) {
        return Err(ContractError::NotWhitelisted);
    }
    Ok(())
}

pub fn with_reentrancy_guard<F>(env: &Env, mut action: F) -> Result<(), ContractError>
where
    F: FnMut() -> Result<(), ContractError>,
{
    if is_reentrancy_active(env) {
        return Err(ContractError::ReentrancyDetected);
    }
    set_reentrancy(env, true);
    let result = action();
    set_reentrancy(env, false);
    result
}
