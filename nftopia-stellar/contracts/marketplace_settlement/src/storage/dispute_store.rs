use soroban_sdk::Env;

use crate::{error::SettlementError, DataKey, Dispute};

pub fn get_dispute(env: &Env, dispute_id: u64) -> Result<Dispute, SettlementError> {
    env.storage()
        .persistent()
        .get(&DataKey::Dispute(dispute_id))
        .ok_or(SettlementError::NotFound)
}

pub fn set_dispute(env: &Env, dispute: &Dispute) {
    env.storage()
        .persistent()
        .set(&DataKey::Dispute(dispute.dispute_id), dispute);
}
