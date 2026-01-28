use soroban_sdk::{Address, Env};

use crate::auction_engine;
use crate::error::SettlementError;
use crate::escrow_manager;
use crate::fee_manager;
use crate::royalty_distributor;
use crate::security::reentrancy_guard;
use crate::storage::{transaction_store, auction_store};
use crate::utils::time_utils::now;
use crate::{
    ExecutionResult, RoyaltyDistribution, SaleTransaction, TransactionState,
};

use crate::NftClient;

pub fn create_sale(
    env: &Env,
    seller: Address,
    nft_address: Address,
    token_id: u64,
    price: i128,
    currency: Address,
    duration_seconds: u64,
) -> Result<u64, SettlementError> {
    seller.require_auth();
    if price <= 0 || duration_seconds == 0 {
        return Err(SettlementError::InvalidAmount);
    }
    let created_at = now(env);
    let expires_at = created_at.saturating_add(duration_seconds);
    let sale_id = crate::next_sale_id(env)?;

    let nft_client = NftClient::new(env, &nft_address);
    nft_client.transfer(&seller, &env.current_contract_address(), &token_id);

    let fee_config = fee_manager::get_fee_config(env)?;
    let royalty_info = RoyaltyDistribution {
        creator_address: seller.clone(),
        creator_percentage: 0,
        seller_percentage: 0,
        platform_percentage: fee_config.platform_fee_bps,
        total_amount: price,
        amounts: soroban_sdk::Map::new(env),
    };

    let mut sale = SaleTransaction {
        transaction_id: sale_id,
        seller: seller.clone(),
        buyer: None,
        nft_address,
        token_id,
        price,
        currency: currency.clone(),
        state: TransactionState::Pending,
        created_at,
        expires_at,
        escrow_address: env.current_contract_address(),
        royalty_info,
        platform_fee: 0,
    };

    transaction_store::set_sale(env, &sale);
    Ok(sale_id)
}

pub fn execute_sale(
    env: &Env,
    transaction_id: u64,
    buyer: Address,
    payment_amount: i128,
) -> Result<ExecutionResult, SettlementError> {
    buyer.require_auth();
    reentrancy_guard::enter(env)?;
    let result = execute_sale_inner(env, transaction_id, buyer, payment_amount);
    reentrancy_guard::exit(env);
    result
}

fn execute_sale_inner(
    env: &Env,
    transaction_id: u64,
    buyer: Address,
    payment_amount: i128,
) -> Result<ExecutionResult, SettlementError> {
    let mut sale = transaction_store::get_sale(env, transaction_id)?;
    if sale.state != TransactionState::Pending {
        return Err(SettlementError::InvalidState);
    }
    let current_time = now(env);
    if current_time > sale.expires_at {
        return Err(SettlementError::Expired);
    }
    if payment_amount != sale.price {
        return Err(SettlementError::InvalidAmount);
    }

    escrow_manager::transfer_in(env, &sale.currency, &buyer, payment_amount)?;
    sale.state = TransactionState::Funded;
    transaction_store::set_sale(env, &sale);

    let distribution = crate::distribute_transaction_inner(env, sale.transaction_id)?;

    let nft_client = NftClient::new(env, &sale.nft_address);
    nft_client.transfer(&env.current_contract_address(), &buyer, &sale.token_id);

    sale.buyer = Some(buyer);
    let mut updated_sale = transaction_store::get_sale(env, sale.transaction_id)?;
    updated_sale.buyer = Some(buyer);
    updated_sale.platform_fee = distribution.platform_fee;
    updated_sale.state = TransactionState::Executed;
    transaction_store::set_sale(env, &updated_sale);

    Ok(ExecutionResult {
        transaction_id: sale.transaction_id,
        nft_transferred: true,
        funds_distributed: distribution.total_amount == sale.price,
    })
}

pub fn cancel_sale(
    env: &Env,
    transaction_id: u64,
    caller: Address,
) -> Result<SaleTransaction, SettlementError> {
    caller.require_auth();
    let mut sale = transaction_store::get_sale(env, transaction_id)?;
    if sale.state != TransactionState::Pending {
        return Err(SettlementError::InvalidState);
    }
    if caller != sale.seller {
        return Err(SettlementError::Unauthorized);
    }

    let nft_client = NftClient::new(env, &sale.nft_address);
    nft_client.transfer(&env.current_contract_address(), &sale.seller, &sale.token_id);
    sale.state = TransactionState::Cancelled;
    transaction_store::set_sale(env, &sale);
    Ok(sale)
}

pub fn cancel_auction(
    env: &Env,
    auction_id: u64,
    caller: Address,
) -> Result<crate::AuctionTransaction, SettlementError> {
    caller.require_auth();
    let auction = auction_store::get_auction(env, auction_id)?;
    if caller != auction.seller {
        return Err(SettlementError::Unauthorized);
    }
    let auction = auction_engine::cancel_auction(env, auction_id)?;
    let nft_client = NftClient::new(env, &auction.nft_address);
    nft_client.transfer(&env.current_contract_address(), &auction.seller, &auction.token_id);
    Ok(auction)
}
