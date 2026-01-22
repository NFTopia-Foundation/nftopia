use soroban_sdk::{Address, Bytes, Env, Symbol};

use crate::error::ContractError;
use crate::events::emit_transfer;
use crate::storage::{
    add_transfer_record, get_balance, get_operator_approval, get_token, set_balance, set_token,
};
use crate::utils::{require_not_paused, require_token_exists, with_reentrancy_guard};

pub fn owner_of(env: &Env, token_id: u64) -> Result<Address, ContractError> {
    let token = get_token(env, token_id)?;
    Ok(token.owner)
}

pub fn is_approved_for_all(env: &Env, owner: &Address, operator: &Address) -> bool {
    get_operator_approval(env, owner, operator)
}

pub fn require_owner_or_operator(
    env: &Env,
    operator: &Address,
    owner: &Address,
) -> Result<(), ContractError> {
    if operator == owner || is_approved_for_all(env, owner, operator) {
        return Ok(());
    }
    Err(ContractError::Unauthorized)
}

pub fn require_approved_or_owner(
    env: &Env,
    operator: &Address,
    token_id: u64,
    owner: &Address,
) -> Result<(), ContractError> {
    let token = get_token(env, token_id)?;
    if operator == owner
        || token.approved.as_ref() == Some(operator)
        || is_approved_for_all(env, owner, operator)
    {
        return Ok(());
    }
    Err(ContractError::Unauthorized)
}

pub fn transfer_internal(
    env: &Env,
    from: Address,
    to: Address,
    token_id: u64,
    operator: Address,
    safe_transfer: bool,
    data: Option<Bytes>,
) -> Result<(), ContractError> {
    require_not_paused(env, false)?;
    require_token_exists(env, token_id)?;

    let mut token = get_token(env, token_id)?;
    if token.owner != from {
        return Err(ContractError::Unauthorized);
    }
    require_approved_or_owner(env, &operator, token_id, &from)?;

    let from_balance = get_balance(env, &from)?;
    if from_balance == 0 {
        return Err(ContractError::Unauthorized);
    }

    set_balance(env, &from, from_balance.saturating_sub(1));
    let to_balance = get_balance(env, &to)?;
    set_balance(env, &to, to_balance.saturating_add(1));

    token.owner = to.clone();
    token.approved = None;
    set_token(env, token_id, token);

    add_transfer_record(env, token_id, &from, &to);
    emit_transfer(env, from.clone(), to.clone(), token_id);

    if safe_transfer && to.is_contract(env) {
        with_reentrancy_guard(env, || {
            let response: bool = env.invoke_contract(
                &to,
                &Symbol::new(env, "on_nft_received"),
                (operator, from, token_id, data),
            );
            if !response {
                return Err(ContractError::Unauthorized);
            }
            Ok(())
        })?;
    }

    Ok(())
}

pub fn batch_transfer_internal(
    env: &Env,
    from: Address,
    to: Address,
    token_ids: soroban_sdk::Vec<u64>,
    operator: Address,
) -> Result<(), ContractError> {
    for token_id in token_ids.iter() {
        transfer_internal(env, from.clone(), to.clone(), token_id, operator.clone(), false, None)?;
    }
    Ok(())
}
