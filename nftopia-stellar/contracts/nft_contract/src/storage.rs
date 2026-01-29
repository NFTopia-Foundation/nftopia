use soroban_sdk::{contracttype, Address, Env, Vec};

use crate::error::ContractError;
use crate::token::{CollectionConfig, TokenData, TransferRecord};
use crate::access_control::Role;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Initialized,
    Owner,
    CollectionConfig,
    NextTokenId,
    TokenCount,
    Token(u64),
    Balance(Address),
    OperatorApproval(Address, Address),
    Role(Role, Address),
    Paused,
    MintPaused,
    TransferPaused,
    WhitelistEnabled,
    Whitelist(Address),
    RevealTime,
    TransferHistory(u64),
    Reentrancy,
}

pub fn is_initialized(env: &Env) -> bool {
    env.storage().instance().get(&DataKey::Initialized).unwrap_or(false)
}

pub fn set_initialized(env: &Env, value: bool) {
    env.storage().instance().set(&DataKey::Initialized, &value);
}

pub fn get_owner(env: &Env) -> Result<Address, ContractError> {
    env.storage()
        .instance()
        .get(&DataKey::Owner)
        .ok_or(ContractError::NotInitialized)
}

pub fn set_owner(env: &Env, owner: Address) {
    env.storage().instance().set(&DataKey::Owner, &owner);
}

pub fn get_collection_config(env: &Env) -> Result<CollectionConfig, ContractError> {
    env.storage()
        .instance()
        .get(&DataKey::CollectionConfig)
        .ok_or(ContractError::NotInitialized)
}

pub fn set_collection_config(env: &Env, config: CollectionConfig) {
    env.storage()
        .instance()
        .set(&DataKey::CollectionConfig, &config);
}

pub fn next_token_id(env: &Env) -> u64 {
    let current: u64 = env.storage().instance().get(&DataKey::NextTokenId).unwrap_or(1);
    env.storage().instance().set(&DataKey::NextTokenId, &(current + 1));
    current
}

pub fn token_count(env: &Env) -> u64 {
    env.storage().instance().get(&DataKey::TokenCount).unwrap_or(0)
}

pub fn increment_token_count(env: &Env) {
    let count = token_count(env) + 1;
    env.storage().instance().set(&DataKey::TokenCount, &count);
}

pub fn get_token(env: &Env, token_id: u64) -> Result<TokenData, ContractError> {
    env.storage()
        .persistent()
        .get(&DataKey::Token(token_id))
        .ok_or(ContractError::TokenNotFound)
}

pub fn set_token(env: &Env, token_id: u64, token: TokenData) {
    env.storage().persistent().set(&DataKey::Token(token_id), &token);
}

pub fn del_token(env: &Env, token_id: u64) {
    env.storage().persistent().remove(&DataKey::Token(token_id));
}

pub fn get_balance(env: &Env, owner: &Address) -> Result<u64, ContractError> {
    Ok(env.storage().persistent().get(&DataKey::Balance(owner.clone())).unwrap_or(0))
}

pub fn set_balance(env: &Env, owner: &Address, balance: u64) {
    env.storage().persistent().set(&DataKey::Balance(owner.clone()), &balance);
}

pub fn increment_balance(env: &Env, owner: &Address, delta: u64) {
    let balance = get_balance(env, owner).unwrap_or(0).saturating_add(delta);
    set_balance(env, owner, balance);
}

pub fn set_operator_approval(env: &Env, owner: &Address, operator: &Address, approved: bool) {
    env.storage()
        .persistent()
        .set(&DataKey::OperatorApproval(owner.clone(), operator.clone()), &approved);
}

pub fn get_operator_approval(env: &Env, owner: &Address, operator: &Address) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::OperatorApproval(owner.clone(), operator.clone()))
        .unwrap_or(false)
}

pub fn set_role_entry(env: &Env, role: Role, addr: &Address, enabled: bool) {
    env.storage()
        .persistent()
        .set(&DataKey::Role(role, addr.clone()), &enabled);
}

pub fn has_role_entry(env: &Env, role: Role, addr: &Address) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Role(role, addr.clone()))
        .unwrap_or(false)
}

pub fn is_paused(env: &Env) -> bool {
    env.storage().instance().get(&DataKey::Paused).unwrap_or(false)
}

pub fn set_paused(env: &Env, paused: bool) {
    env.storage().instance().set(&DataKey::Paused, &paused);
}

pub fn is_mint_paused(env: &Env) -> bool {
    env.storage().instance().get(&DataKey::MintPaused).unwrap_or(false)
}

pub fn set_mint_paused(env: &Env, paused: bool) {
    env.storage().instance().set(&DataKey::MintPaused, &paused);
}

pub fn is_transfer_paused(env: &Env) -> bool {
    env.storage().instance().get(&DataKey::TransferPaused).unwrap_or(false)
}

pub fn set_transfer_paused(env: &Env, paused: bool) {
    env.storage().instance().set(&DataKey::TransferPaused, &paused);
}

pub fn whitelist_enabled(env: &Env) -> bool {
    env.storage().instance().get(&DataKey::WhitelistEnabled).unwrap_or(false)
}

pub fn set_whitelist_enabled(env: &Env, enabled: bool) {
    env.storage().instance().set(&DataKey::WhitelistEnabled, &enabled);
}

pub fn set_whitelisted(env: &Env, addr: Address, enabled: bool) {
    env.storage().persistent().set(&DataKey::Whitelist(addr), &enabled);
}

pub fn is_whitelisted(env: &Env, addr: &Address) -> bool {
    env.storage().persistent().get(&DataKey::Whitelist(addr.clone())).unwrap_or(false)
}

pub fn set_reveal_time(env: &Env, timestamp: u64) {
    env.storage().instance().set(&DataKey::RevealTime, &timestamp);
}

pub fn get_reveal_time(env: &Env) -> Result<u64, ContractError> {
    Ok(env.storage().instance().get(&DataKey::RevealTime).unwrap_or(0))
}

pub fn get_transfer_history(env: &Env, token_id: u64) -> Result<Vec<TransferRecord>, ContractError> {
    Ok(env
        .storage()
        .persistent()
        .get(&DataKey::TransferHistory(token_id))
        .unwrap_or(Vec::new(env)))
}

pub fn add_transfer_record(env: &Env, token_id: u64, from: &Address, to: &Address) {
    let mut history = get_transfer_history(env, token_id).unwrap_or(Vec::new(env));
    history.push_back(TransferRecord {
        from: from.clone(),
        to: to.clone(),
        timestamp: env.ledger().timestamp(),
    });
    env.storage().persistent().set(&DataKey::TransferHistory(token_id), &history);
}

pub fn is_reentrancy_active(env: &Env) -> bool {
    env.storage().instance().get(&DataKey::Reentrancy).unwrap_or(false)
}

pub fn set_reentrancy(env: &Env, active: bool) {
    env.storage().instance().set(&DataKey::Reentrancy, &active);
}
