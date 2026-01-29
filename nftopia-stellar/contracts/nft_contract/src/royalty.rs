use soroban_sdk::{Address, Env};

use crate::error::ContractError;
use crate::storage::{get_collection_config, get_token, set_collection_config, set_token};
use crate::token::RoyaltyInfo;
use crate::utils::validate_royalty_info;

pub fn set_default_royalty(
    env: &Env,
    recipient: Address,
    percentage: u32,
) -> Result<(), ContractError> {
    validate_royalty_info(percentage)?;
    let mut config = get_collection_config(env)?;
    config.royalty_default = RoyaltyInfo {
        recipient,
        percentage,
    };
    set_collection_config(env, config);
    Ok(())
}

pub fn set_token_royalty(
    env: &Env,
    token_id: u64,
    recipient: Address,
    percentage: u32,
) -> Result<(), ContractError> {
    validate_royalty_info(percentage)?;
    let mut token = get_token(env, token_id)?;
    token.royalty_recipient = recipient;
    token.royalty_percentage = percentage;
    set_token(env, token_id, token);
    Ok(())
}

pub fn get_royalty_info(
    env: &Env,
    token_id: u64,
    sale_price: i128,
) -> Result<(Address, i128), ContractError> {
    if sale_price < 0 {
        return Err(ContractError::InvalidSalePrice);
    }
    let token = get_token(env, token_id)?;
    let amount = sale_price
        .saturating_mul(token.royalty_percentage as i128)
        .saturating_div(10_000);
    Ok((token.royalty_recipient, amount))
}
