use soroban_sdk::{vec, Address, Bytes, BytesN, Env, Executable, IntoVal, Symbol};

use crate::error::ContractError;
use crate::events;
use crate::interface::nft_received_magic;
use crate::storage;
use crate::token::TransferRecord;

pub fn transfer(
    env: &Env,
    from: Address,
    to: Address,
    token_id: u64,
    data: Option<Bytes>,
    safe: bool,
) -> Result<(), ContractError> {
    if storage::is_transfer_paused(env) {
        return Err(ContractError::TransferPaused);
    }

    let mut token = storage::read_token(env, token_id)?;
    if token.owner != from {
        return Err(ContractError::NotOwner);
    }

    from.require_auth();

    if from == to {
        return Ok(());
    }

    let from_balance = storage::read_balance(env, &from);
    let to_balance = storage::read_balance(env, &to);
    storage::write_balance(env, &from, from_balance.saturating_sub(1));
    storage::write_balance(env, &to, to_balance.saturating_add(1));

    token.owner = to.clone();
    token.approved = None;
    storage::write_token(env, &token);

    storage::append_transfer_history(
        env,
        token_id,
        TransferRecord {
            operator: from.clone(),
            from: from.clone(),
            to: to.clone(),
            timestamp: env.ledger().timestamp(),
        },
    );

    events::emit_transfer(env, &from, &to, token_id);

    if safe {
        let is_contract = matches!(to.executable(), Some(Executable::Wasm(_)));
        if is_contract {
            let result = env.try_invoke_contract::<BytesN<32>, soroban_sdk::InvokeError>(
                &to,
                &Symbol::new(env, "on_nft_received"),
                vec![
                    env,
                    from.clone().into_val(env),
                    from.into_val(env),
                    token_id.into_val(env),
                    data.into_val(env),
                ],
            );
            let magic = match result {
                Ok(Ok(value)) => value,
                _ => return Err(ContractError::InvalidInput),
            };
            if magic != nft_received_magic(env) {
                return Err(ContractError::InvalidInput);
            }
        }
    }

    Ok(())
}
