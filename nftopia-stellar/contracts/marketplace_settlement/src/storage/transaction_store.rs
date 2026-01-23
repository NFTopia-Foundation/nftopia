use soroban_sdk::Env;

use crate::{error::SettlementError, DataKey, SaleTransaction};

pub fn get_sale(env: &Env, sale_id: u64) -> Result<SaleTransaction, SettlementError> {
    env.storage()
        .persistent()
        .get(&DataKey::Sale(sale_id))
        .ok_or(SettlementError::NotFound)
}

pub fn set_sale(env: &Env, sale: &SaleTransaction) {
    env.storage()
        .persistent()
        .set(&DataKey::Sale(sale.transaction_id), sale);
}
