use soroban_sdk::{contracttype, Address, Env, Vec};

use crate::access_control::Role;
use crate::error::ContractError;
use crate::token::{CollectionConfig, SaleRecord, TokenData, TransferRecord};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Config,
    Owner,
    NextTokenId,
    TotalSupply,
    Token(u64),
    Balance(Address),
    OperatorApproval(Address, Address),
    Role(Role, Address),
    TransferPaused,
    MintPaused,
    Whitelist(Address),
    TokenHistory(u64),
    TransferHistory(u64),
}

pub fn is_initialized(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Config)
}

pub fn read_config(env: &Env) -> Result<CollectionConfig, ContractError> {
    env.storage()
        .instance()
        .get(&DataKey::Config)
        .ok_or(ContractError::NotInitialized)
}

pub fn write_config(env: &Env, config: &CollectionConfig) {
    env.storage().instance().set(&DataKey::Config, config);
}

pub fn read_owner(env: &Env) -> Result<Address, ContractError> {
    env.storage()
        .instance()
        .get(&DataKey::Owner)
        .ok_or(ContractError::NotInitialized)
}

pub fn write_owner(env: &Env, owner: &Address) {
    env.storage().instance().set(&DataKey::Owner, owner);
    env.storage()
        .persistent()
        .set(&DataKey::Role(Role::Owner, owner.clone()), &true);
}

pub fn read_next_token_id(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::NextTokenId)
        .unwrap_or(1)
}

pub fn write_next_token_id(env: &Env, next_id: u64) {
    env.storage().instance().set(&DataKey::NextTokenId, &next_id);
}

pub fn read_total_supply(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::TotalSupply)
        .unwrap_or(0)
}

pub fn write_total_supply(env: &Env, total: u64) {
    env.storage().instance().set(&DataKey::TotalSupply, &total);
}

pub fn read_token(env: &Env, token_id: u64) -> Result<TokenData, ContractError> {
    env.storage()
        .persistent()
        .get(&DataKey::Token(token_id))
        .ok_or(ContractError::TokenNotFound)
}

pub fn write_token(env: &Env, token: &TokenData) {
    env.storage()
        .persistent()
        .set(&DataKey::Token(token.id), token);
}

pub fn delete_token(env: &Env, token_id: u64) {
    env.storage().persistent().remove(&DataKey::Token(token_id));
}

pub fn read_balance(env: &Env, owner: &Address) -> u64 {
    env.storage()
        .persistent()
        .get(&DataKey::Balance(owner.clone()))
        .unwrap_or(0)
}

pub fn write_balance(env: &Env, owner: &Address, balance: u64) {
    env.storage()
        .persistent()
        .set(&DataKey::Balance(owner.clone()), &balance);
}

pub fn read_approval(env: &Env, token_id: u64) -> Option<Address> {
    let token = read_token(env, token_id).ok()?;
    token.approved
}

pub fn set_approval(env: &Env, token_id: u64, approved: Option<Address>) -> Result<(), ContractError> {
    let mut token = read_token(env, token_id)?;
    token.approved = approved;
    write_token(env, &token);
    Ok(())
}

pub fn set_operator_approval(env: &Env, owner: &Address, operator: &Address, approved: bool) {
    env.storage()
        .persistent()
        .set(&DataKey::OperatorApproval(owner.clone(), operator.clone()), &approved);
}

pub fn is_operator_approved(env: &Env, owner: &Address, operator: &Address) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::OperatorApproval(owner.clone(), operator.clone()))
        .unwrap_or(false)
}

pub fn set_paused(env: &Env, mint_paused: bool, transfer_paused: bool) {
    env.storage().instance().set(&DataKey::MintPaused, &mint_paused);
    env.storage()
        .instance()
        .set(&DataKey::TransferPaused, &transfer_paused);
}

pub fn is_mint_paused(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::MintPaused)
        .unwrap_or(false)
}

pub fn is_transfer_paused(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::TransferPaused)
        .unwrap_or(false)
}

pub fn set_whitelisted(env: &Env, account: &Address, enabled: bool) {
    env.storage()
        .persistent()
        .set(&DataKey::Whitelist(account.clone()), &enabled);
}

pub fn is_whitelisted(env: &Env, account: &Address) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Whitelist(account.clone()))
        .unwrap_or(false)
}

pub fn has_role(env: &Env, role: Role, account: &Address) -> Result<bool, ContractError> {
    if role == Role::Owner {
        let owner = read_owner(env)?;
        Ok(owner == *account)
    } else {
        Ok(env
            .storage()
            .persistent()
            .get(&DataKey::Role(role, account.clone()))
            .unwrap_or(false))
    }
}

pub fn read_history(env: &Env, token_id: u64) -> Vec<SaleRecord> {
    env.storage()
        .persistent()
        .get(&DataKey::TokenHistory(token_id))
        .unwrap_or(Vec::new(env))
}

pub fn append_history(env: &Env, token_id: u64, record: SaleRecord) {
    let mut history = read_history(env, token_id);
    history.push_back(record);
    env.storage()
        .persistent()
        .set(&DataKey::TokenHistory(token_id), &history);
}

pub fn read_transfer_history(env: &Env, token_id: u64) -> Vec<TransferRecord> {
    env.storage()
        .persistent()
        .get(&DataKey::TransferHistory(token_id))
        .unwrap_or(Vec::new(env))
}

pub fn append_transfer_history(env: &Env, token_id: u64, record: TransferRecord) {
    let mut history = read_transfer_history(env, token_id);
    history.push_back(record);
    env.storage()
        .persistent()
        .set(&DataKey::TransferHistory(token_id), &history);
}
