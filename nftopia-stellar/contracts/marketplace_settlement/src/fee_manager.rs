use soroban_sdk::{Address, Env, Map, Vec};

use crate::{error::SettlementError, storage::transaction_store, DataKey, FeeConfig, SaleTransaction};
use crate::utils::math_utils::{checked_add, mul_bps};

pub fn get_fee_config(env: &Env) -> Result<FeeConfig, SettlementError> {
    env.storage()
        .persistent()
        .get(&DataKey::FeeConfig)
        .ok_or(SettlementError::NotInitialized)
}

pub fn set_fee_config(env: &Env, config: &FeeConfig) {
    env.storage()
        .persistent()
        .set(&DataKey::FeeConfig, config);
}

pub fn add_platform_fee(env: &Env, asset: &Address, amount: i128) -> Result<(), SettlementError> {
    if amount <= 0 {
        return Ok(());
    }
    let mut fees: Map<Address, i128> = env
        .storage()
        .persistent()
        .get(&DataKey::PlatformFees)
        .unwrap_or(Map::new(env));
    let current = fees.get(asset).unwrap_or(0);
    let updated = checked_add(current, amount)?;
    fees.set(asset, updated);
    env.storage()
        .persistent()
        .set(&DataKey::PlatformFees, &fees);
    Ok(())
}

pub fn take_platform_fee(env: &Env, sale: &SaleTransaction) -> Result<i128, SettlementError> {
    let config = get_fee_config(env)?;
    let base_fee = mul_bps(sale.price, config.platform_fee_bps)?;
    let fee = apply_fee_bounds(base_fee, config.minimum_fee, config.maximum_fee);
    if fee > sale.price {
        return Ok(sale.price);
    }
    Ok(fee)
}

pub fn apply_dynamic_discount(
    env: &Env,
    sale: &SaleTransaction,
    base_fee: i128,
    tiers: &Vec<crate::VolumeTier>,
) -> Result<i128, SettlementError> {
    let mut best_discount_bps = 0u32;
    let sale_volume = sale.price;
    for tier in tiers.iter() {
        if sale_volume >= tier.min_volume && tier.fee_discount_bps > best_discount_bps {
            best_discount_bps = tier.fee_discount_bps;
        }
    }
    if best_discount_bps == 0 {
        return Ok(base_fee);
    }
    let discount = mul_bps(base_fee, best_discount_bps)?;
    Ok(base_fee - discount)
}

pub fn apply_fee_bounds(base_fee: i128, min_fee: i128, max_fee: i128) -> i128 {
    let mut fee = base_fee;
    if fee < min_fee {
        fee = min_fee;
    }
    if max_fee > 0 && fee > max_fee {
        fee = max_fee;
    }
    fee
}

pub fn update_sale_platform_fee(env: &Env, sale_id: u64, new_fee: i128) -> Result<(), SettlementError> {
    let mut sale = transaction_store::get_sale(env, sale_id)?;
    sale.platform_fee = new_fee;
    transaction_store::set_sale(env, &sale);
    Ok(())
}
