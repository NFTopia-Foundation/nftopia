use soroban_sdk::{contracttype, Address, Env};

use crate::error::ContractError;
use crate::storage::{self, DataKey};

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Role {
    Owner,
    Admin,
    Minter,
    Burner,
    MetadataUpdater,
    Marketplace,
}

pub fn require_owner(env: &Env) -> Result<Address, ContractError> {
    let owner = storage::read_owner(env)?;
    owner.require_auth();
    Ok(owner)
}

pub fn require_admin(env: &Env) -> Result<Address, ContractError> {
    require_owner(env)
}

pub fn require_role(env: &Env, _role: Role) -> Result<Address, ContractError> {
    require_owner(env)
}

pub fn set_role(env: &Env, role: Role, account: Address, enabled: bool) -> Result<(), ContractError> {
    let _ = require_owner(env)?;
    let key = DataKey::Role(role, account.clone());
    env.storage().persistent().set(&key, &enabled);
    Ok(())
}
