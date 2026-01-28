use soroban_sdk::{Env, Symbol};

use crate::error::SettlementError;

const REENTRANCY_KEY: Symbol = Symbol::short("reent");

pub fn enter(env: &Env) -> Result<(), SettlementError> {
    let storage = env.storage().instance();
    let locked: bool = storage.get(&REENTRANCY_KEY).unwrap_or(false);
    if locked {
        return Err(SettlementError::InvalidState);
    }
    storage.set(&REENTRANCY_KEY, &true);
    Ok(())
}

pub fn exit(env: &Env) {
    env.storage().instance().set(&REENTRANCY_KEY, &false);
}
