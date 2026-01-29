use soroban_sdk::{contracttype, Address, Env};

use crate::error::ContractError;
use crate::storage::{get_owner, has_role_entry, set_role_entry};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Role {
    Owner,
    Admin,
    Minter,
    Burner,
    MetadataUpdater,
}

pub fn set_role(env: &Env, role: Role, addr: Address, enabled: bool) {
    set_role_entry(env, role, &addr, enabled);
}

pub fn has_role(env: &Env, role: Role, addr: &Address) -> bool {
    if role == Role::Owner {
        if let Ok(owner) = get_owner(env) {
            return &owner == addr;
        }
        return false;
    }

    if let Ok(owner) = get_owner(env) {
        if &owner == addr {
            return true;
        }
    }

    has_role_entry(env, role, addr)
}

pub fn require_role(env: &Env, role: Role) -> Result<(), ContractError> {
    let invoker = env.invoker();
    invoker.require_auth();
    if !has_role(env, role, &invoker) {
        return Err(ContractError::Unauthorized);
    }
    Ok(())
}

pub fn require_owner(env: &Env) -> Result<(), ContractError> {
    let invoker = env.invoker();
    invoker.require_auth();
    let owner = get_owner(env)?;
    if invoker != owner {
        return Err(ContractError::Unauthorized);
    }
    Ok(())
}
