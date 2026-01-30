use soroban_sdk::{Address, Env};

use crate::access_control::{require_admin, require_role, Role};
use crate::error::ContractError;
use crate::events;
use crate::storage;
use crate::token::RoyaltyInfo;

const MAX_BPS: u32 = 10_000;

pub fn set_default_royalty(
    env: &Env,
    recipient: Address,
    percentage: u32,
) -> Result<(), ContractError> {
    let _ = require_admin(env)?;
    if percentage > MAX_BPS {
        return Err(ContractError::RoyaltyTooHigh);
    }
    let mut config = storage::read_config(env)?;
    config.royalty_default = RoyaltyInfo {
        recipient: recipient.clone(),
        percentage,
    };
    storage::write_config(env, &config);
    events::emit_royalty_update(env, None, &config.royalty_default);
    Ok(())
}

pub fn set_token_royalty(
    env: &Env,
    token_id: u64,
    recipient: Address,
    percentage: u32,
) -> Result<(), ContractError> {
    let mut token = storage::read_token(env, token_id)?;
    token.owner.require_auth();
    if percentage > MAX_BPS {
        return Err(ContractError::RoyaltyTooHigh);
    }
    token.royalty_recipient = recipient.clone();
    token.royalty_percentage = percentage;
    storage::write_token(env, &token);
    events::emit_royalty_update(
        env,
        Some(token_id),
        &RoyaltyInfo {
            recipient,
            percentage,
        },
    );
    Ok(())
}

pub fn get_royalty_info(
    env: &Env,
    token_id: u64,
    sale_price: i128,
) -> Result<(Address, i128), ContractError> {
    if sale_price < 0 {
        return Err(ContractError::InvalidInput);
    }
    let token = storage::read_token(env, token_id)?;
    let percentage = token.royalty_percentage as i128;
    let royalty_amount = sale_price
        .saturating_mul(percentage)
        .checked_div(MAX_BPS as i128)
        .unwrap_or(0);
    Ok((token.royalty_recipient, royalty_amount))
}

pub fn require_marketplace(env: &Env) -> Result<Address, ContractError> {
    require_role(env, Role::Marketplace)
}
