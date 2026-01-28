use soroban_sdk::{Address, Env};
use soroban_sdk::token::TokenClient;

use crate::error::SettlementError;

pub fn transfer_in(env: &Env, asset: &Address, from: &Address, amount: i128) -> Result<(), SettlementError> {
    if amount <= 0 {
        return Err(SettlementError::InvalidAmount);
    }
    let client = TokenClient::new(env, asset);
    client.transfer(from, &env.current_contract_address(), &amount);
    Ok(())
}

pub fn transfer_out(env: &Env, asset: &Address, to: &Address, amount: i128) -> Result<(), SettlementError> {
    if amount <= 0 {
        return Err(SettlementError::InvalidAmount);
    }
    let client = TokenClient::new(env, asset);
    client.transfer(&env.current_contract_address(), to, &amount);
    Ok(())
}
