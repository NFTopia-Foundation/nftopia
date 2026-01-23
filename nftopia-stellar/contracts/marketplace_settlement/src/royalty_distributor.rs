use soroban_sdk::{Address, Env, Map};

use crate::error::SettlementError;
use crate::escrow_manager;
use crate::fee_manager;
use crate::utils::math_utils::{checked_add, checked_sub, mul_bps};
use crate::{DistributionResult, RoyaltyDistribution, SaleTransaction};

pub fn calculate_royalties(
    env: &Env,
    sale: &SaleTransaction,
    creator: &Address,
    creator_bps: u32,
    seller_bps: u32,
    platform_bps: u32,
) -> Result<RoyaltyDistribution, SettlementError> {
    let mut amounts = Map::new(env);
    let creator_amount = mul_bps(sale.price, creator_bps)?;
    let platform_amount = mul_bps(sale.price, platform_bps)?;
    let mut remaining = checked_sub(sale.price, creator_amount)?;
    remaining = checked_sub(remaining, platform_amount)?;
    let seller_amount = if seller_bps > 0 {
        mul_bps(sale.price, seller_bps)?
    } else {
        remaining
    };
    amounts.set(creator, creator_amount);
    amounts.set(&sale.seller, seller_amount);
    Ok(RoyaltyDistribution {
        creator_address: creator.clone(),
        creator_percentage: creator_bps,
        seller_percentage: seller_bps,
        platform_percentage: platform_bps,
        total_amount: sale.price,
        amounts,
    })
}

pub fn distribute_funds(env: &Env, sale: &SaleTransaction) -> Result<DistributionResult, SettlementError> {
    let config = fee_manager::get_fee_config(env)?;
    let mut platform_fee = fee_manager::take_platform_fee(env, sale)?;

    if config.dynamic_fee_enabled {
        platform_fee = fee_manager::apply_dynamic_discount(env, sale, platform_fee, &config.volume_discounts)?;
    }
    let mut vip_exempt = is_vip(&config.vip_exemptions, &sale.seller);
    if !vip_exempt {
        if let Some(buyer) = sale.buyer.clone() {
            vip_exempt = is_vip(&config.vip_exemptions, &buyer);
        }
    }
    if vip_exempt {
        platform_fee = 0;
    }

    let creator_address = sale.royalty_info.creator_address.clone();
    let creator_bps = sale.royalty_info.creator_percentage;
    let seller_bps = sale.royalty_info.seller_percentage;

    let distribution = calculate_royalties(
        env,
        sale,
        &creator_address,
        creator_bps,
        seller_bps,
        config.platform_fee_bps,
    )?;

    let creator_amount = distribution
        .amounts
        .get(&creator_address)
        .unwrap_or(0);
    let seller_amount = distribution
        .amounts
        .get(&sale.seller)
        .unwrap_or(0);

    let total_out = checked_add(creator_amount, seller_amount)?;
    let expected_out = checked_sub(sale.price, platform_fee)?;
    if total_out != expected_out {
        return Err(SettlementError::InvalidAmount);
    }

    if creator_amount > 0 {
        escrow_manager::transfer_out(env, &sale.currency, &creator_address, creator_amount)?;
    }
    escrow_manager::transfer_out(env, &sale.currency, &sale.seller, seller_amount)?;
    fee_manager::add_platform_fee(env, &sale.currency, platform_fee)?;

    Ok(DistributionResult {
        total_amount: sale.price,
        platform_fee,
        creator_amount,
        seller_amount,
    })
}

fn is_vip(vips: &soroban_sdk::Vec<Address>, address: &Address) -> bool {
    for vip in vips.iter() {
        if vip == *address {
            return true;
        }
    }
    false
}
