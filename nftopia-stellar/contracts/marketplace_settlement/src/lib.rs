#![no_std]

use soroban_sdk::{contract, contractclient, contractimpl, contracttype, Address, BytesN, Env, Map, String, Vec};

mod auction_engine;
mod dispute_resolution;
mod escrow_manager;
mod fee_manager;
mod royalty_distributor;
mod settlement_core;
mod storage;
mod utils;
mod security;
mod error;

pub use error::SettlementError;

pub type Asset = Address;

#[contractclient(name = "NftClient")]
pub trait NftInterface {
    fn transfer(env: Env, from: Address, to: Address, token_id: u64);
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TransactionState {
    Pending,
    Funded,
    Executed,
    Cancelled,
    Disputed,
    Resolved,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SaleTransaction {
    pub transaction_id: u64,
    pub seller: Address,
    pub buyer: Option<Address>,
    pub nft_address: Address,
    pub token_id: u64,
    pub price: i128,
    pub currency: Asset,
    pub state: TransactionState,
    pub created_at: u64,
    pub expires_at: u64,
    pub escrow_address: Address,
    pub royalty_info: RoyaltyDistribution,
    pub platform_fee: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuctionTransaction {
    pub auction_id: u64,
    pub seller: Address,
    pub nft_address: Address,
    pub token_id: u64,
    pub starting_price: i128,
    pub reserve_price: i128,
    pub highest_bid: i128,
    pub highest_bidder: Option<Address>,
    pub bid_increment: i128,
    pub start_time: u64,
    pub end_time: u64,
    pub state: TransactionState,
    pub bids: Vec<Bid>,
    pub extension_window: u64,
    pub currency: Asset,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Bid {
    pub bidder: Address,
    pub amount: i128,
    pub placed_at: u64,
    pub is_committed: bool,
    pub commitment_hash: Option<BytesN<32>>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoyaltyDistribution {
    pub creator_address: Address,
    pub creator_percentage: u32,
    pub seller_percentage: u32,
    pub platform_percentage: u32,
    pub total_amount: i128,
    pub amounts: Map<Address, i128>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Dispute {
    pub dispute_id: u64,
    pub transaction_id: u64,
    pub initiator: Address,
    pub reason: String,
    pub evidence_uri: Option<String>,
    pub arbitrators: Vec<Address>,
    pub votes: Map<Address, bool>,
    pub required_votes: u32,
    pub created_at: u64,
    pub resolved_at: Option<u64>,
    pub resolution: Option<DisputeResolution>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FeeConfig {
    pub platform_fee_bps: u32,
    pub minimum_fee: i128,
    pub maximum_fee: i128,
    pub fee_recipient: Address,
    pub dynamic_fee_enabled: bool,
    pub volume_discounts: Vec<VolumeTier>,
    pub vip_exemptions: Vec<Address>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VolumeTier {
    pub min_volume: i128,
    pub fee_discount_bps: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DisputeResolution {
    InitiatorWins,
    InitiatorLoses,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EmergencyWithdrawalReason {
    StuckFunds,
    ContractUpgrade,
    ArbitratorDecision,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ExecutionResult {
    pub transaction_id: u64,
    pub nft_transferred: bool,
    pub funds_distributed: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DistributionResult {
    pub total_amount: i128,
    pub platform_fee: i128,
    pub creator_amount: i128,
    pub seller_amount: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Counters {
    pub sale: u64,
    pub auction: u64,
    pub dispute: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Sale(u64),
    Auction(u64),
    Dispute(u64),
    Counters,
    FeeConfig,
    Admin,
    PlatformFees,
    DefaultCurrency,
}

#[contract]
pub struct MarketplaceSettlement;

#[contractimpl]
impl MarketplaceSettlement {
    pub fn initialize(env: Env, admin: Address, fee_config: FeeConfig, default_currency: Asset) -> Result<(), SettlementError> {
        if env.storage().persistent().has(&DataKey::Admin) {
            return Err(SettlementError::AlreadyExists);
        }
        admin.require_auth();
        validate_fee_config(&fee_config)?;
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::FeeConfig, &fee_config);
        env.storage().persistent().set(&DataKey::DefaultCurrency, &default_currency);
        env.storage().persistent().set(&DataKey::Counters, &Counters { sale: 0, auction: 0, dispute: 0 });
        Ok(())
    }

    pub fn create_sale(
        env: Env,
        seller: Address,
        nft_address: Address,
        token_id: u64,
        price: i128,
        currency: Asset,
        duration_seconds: u64,
    ) -> Result<u64, SettlementError> {
        settlement_core::create_sale(&env, seller, nft_address, token_id, price, currency, duration_seconds)
    }

    pub fn create_auction(
        env: Env,
        seller: Address,
        nft_address: Address,
        token_id: u64,
        starting_price: i128,
        reserve_price: i128,
        duration_seconds: u64,
        bid_increment: i128,
    ) -> Result<u64, SettlementError> {
        seller.require_auth();
        if starting_price <= 0 || bid_increment <= 0 || duration_seconds == 0 {
            return Err(SettlementError::InvalidAmount);
        }
        if reserve_price > 0 && reserve_price < starting_price {
            return Err(SettlementError::InvalidAmount);
        }
        let default_currency: Asset = env
            .storage()
            .persistent()
            .get(&DataKey::DefaultCurrency)
            .ok_or(SettlementError::NotInitialized)?;
        let start_time = utils::time_utils::now(&env);
        let end_time = start_time.saturating_add(duration_seconds);
        let auction_id = next_auction_id(&env)?;
        let nft_client = NftClient::new(&env, &nft_address);
        nft_client.transfer(&seller, &env.current_contract_address(), &token_id);

        let auction = AuctionTransaction {
            auction_id,
            seller: seller.clone(),
            nft_address,
            token_id,
            starting_price,
            reserve_price,
            highest_bid: 0,
            highest_bidder: None,
            bid_increment,
            start_time,
            end_time,
            state: TransactionState::Pending,
            bids: Vec::new(&env),
            extension_window: 120,
            currency: default_currency,
        };
        storage::auction_store::set_auction(&env, &auction);
        Ok(auction_id)
    }

    pub fn execute_sale(
        env: Env,
        transaction_id: u64,
        buyer: Address,
        payment_amount: i128,
    ) -> Result<ExecutionResult, SettlementError> {
        settlement_core::execute_sale(&env, transaction_id, buyer, payment_amount)
    }

    pub fn execute_bid(env: Env, auction_id: u64) -> Result<ExecutionResult, SettlementError> {
        security::reentrancy_guard::enter(&env)?;
        let result = execute_bid_inner(&env, auction_id);
        security::reentrancy_guard::exit(&env);
        result
    }

    pub fn place_bid(
        env: Env,
        auction_id: u64,
        bid_amount: i128,
        commitment_hash: Option<BytesN<32>>,
    ) -> Result<(), SettlementError> {
        let bidder = env.invoker();
        bidder.require_auth();
        auction_engine::place_bid(&env, auction_id, bidder, bid_amount, commitment_hash)
    }

    pub fn reveal_bid(
        env: Env,
        auction_id: u64,
        bid_amount: i128,
        salt: BytesN<32>,
    ) -> Result<(), SettlementError> {
        let bidder = env.invoker();
        bidder.require_auth();
        auction_engine::reveal_bid(&env, auction_id, bidder, bid_amount, salt)
    }

    pub fn distribute_transaction(env: Env, transaction_id: u64) -> Result<DistributionResult, SettlementError> {
        security::reentrancy_guard::enter(&env)?;
        let result = distribute_transaction_inner(&env, transaction_id);
        security::reentrancy_guard::exit(&env);
        result
    }

    pub fn calculate_royalties(
        env: Env,
        nft_address: Address,
        token_id: u64,
        sale_price: i128,
    ) -> Result<RoyaltyDistribution, SettlementError> {
        let _ = (nft_address, token_id);
        let fee_config = fee_manager::get_fee_config(&env)?;
        let creator = env.invoker();
        let sale = SaleTransaction {
            transaction_id: 0,
            seller: creator.clone(),
            buyer: None,
            nft_address: creator.clone(),
            token_id,
            price: sale_price,
            currency: env
                .storage()
                .persistent()
                .get(&DataKey::DefaultCurrency)
                .ok_or(SettlementError::NotInitialized)?,
            state: TransactionState::Pending,
            created_at: 0,
            expires_at: 0,
            escrow_address: creator.clone(),
            royalty_info: RoyaltyDistribution {
                creator_address: creator.clone(),
                creator_percentage: 0,
                seller_percentage: 0,
                platform_percentage: fee_config.platform_fee_bps,
                total_amount: sale_price,
                amounts: Map::new(&env),
            },
            platform_fee: 0,
        };
        royalty_distributor::calculate_royalties(&env, &sale, &creator, 0, 0, fee_config.platform_fee_bps)
    }

    pub fn initiate_dispute(
        env: Env,
        transaction_id: u64,
        reason: String,
        evidence_uri: Option<String>,
    ) -> Result<u64, SettlementError> {
        let initiator = env.invoker();
        initiator.require_auth();
        let fee_config = fee_manager::get_fee_config(&env)?;
        let mut arbitrators = Vec::new(&env);
        arbitrators.push_back(fee_config.fee_recipient);
        let dispute = dispute_resolution::initiate_dispute(
            &env,
            transaction_id,
            initiator,
            reason,
            evidence_uri,
            arbitrators,
            1,
        )?;
        Ok(dispute.dispute_id)
    }

    pub fn vote_on_dispute(
        env: Env,
        dispute_id: u64,
        vote: bool,
    ) -> Result<(), SettlementError> {
        let voter = env.invoker();
        voter.require_auth();
        let dispute = dispute_resolution::vote_on_dispute(&env, dispute_id, voter, vote)?;
        let _ = dispute;
        Ok(())
    }

    pub fn update_fee_config(env: Env, new_config: FeeConfig) -> Result<(), SettlementError> {
        let admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .ok_or(SettlementError::NotInitialized)?;
        admin.require_auth();
        validate_fee_config(&new_config)?;
        fee_manager::set_fee_config(&env, &new_config);
        Ok(())
    }

    pub fn withdraw_platform_fees(env: Env, asset: Asset, amount: i128) -> Result<(), SettlementError> {
        let fee_config = fee_manager::get_fee_config(&env)?;
        fee_config.fee_recipient.require_auth();
        if amount <= 0 {
            return Err(SettlementError::InvalidAmount);
        }
        let mut fees: Map<Address, i128> = env
            .storage()
            .persistent()
            .get(&DataKey::PlatformFees)
            .unwrap_or(Map::new(&env));
        let available = fees.get(&asset).unwrap_or(0);
        if amount > available {
            return Err(SettlementError::InvalidAmount);
        }
        let remaining = utils::math_utils::checked_sub(available, amount)?;
        fees.set(&asset, remaining);
        env.storage()
            .persistent()
            .set(&DataKey::PlatformFees, &fees);
        escrow_manager::transfer_out(&env, &asset, &fee_config.fee_recipient, amount)?;
        Ok(())
    }

    pub fn cancel_transaction(env: Env, transaction_id: u64) -> Result<(), SettlementError> {
        let caller = env.invoker();
        caller.require_auth();
        if storage::transaction_store::get_sale(&env, transaction_id).is_ok() {
            let _ = settlement_core::cancel_sale(&env, transaction_id, caller)?;
            return Ok(());
        }
        if storage::auction_store::get_auction(&env, transaction_id).is_ok() {
            let _ = settlement_core::cancel_auction(&env, transaction_id, caller)?;
            return Ok(());
        }
        Err(SettlementError::NotFound)
    }

    pub fn emergency_withdraw(
        env: Env,
        transaction_id: u64,
        _reason: EmergencyWithdrawalReason,
    ) -> Result<(), SettlementError> {
        let admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .ok_or(SettlementError::NotInitialized)?;
        admin.require_auth();
        if let Ok(sale) = storage::transaction_store::get_sale(&env, transaction_id) {
            let nft_client = NftClient::new(&env, &sale.nft_address);
            nft_client.transfer(&env.current_contract_address(), &sale.seller, &sale.token_id);
            return Ok(());
        }
        if let Ok(auction) = storage::auction_store::get_auction(&env, transaction_id) {
            if let Some(highest_bidder) = auction.highest_bidder.clone() {
                if auction.highest_bid > 0 {
                    escrow_manager::transfer_out(&env, &auction.currency, &highest_bidder, auction.highest_bid)?;
                }
            }
            let nft_client = NftClient::new(&env, &auction.nft_address);
            nft_client.transfer(&env.current_contract_address(), &auction.seller, &auction.token_id);
            return Ok(());
        }
        Err(SettlementError::NotFound)
    }
}

fn execute_bid_inner(env: &Env, auction_id: u64) -> Result<ExecutionResult, SettlementError> {
    let auction = auction_engine::finalize_auction(env, auction_id)?;
    let winner = auction.highest_bidder.ok_or(SettlementError::InvalidState)?;
    if auction.reserve_price > 0 && auction.highest_bid < auction.reserve_price {
        if auction.highest_bid > 0 {
            escrow_manager::transfer_out(env, &auction.currency, &winner, auction.highest_bid)?;
        }
        let nft_client = NftClient::new(env, &auction.nft_address);
        nft_client.transfer(&env.current_contract_address(), &auction.seller, &auction.token_id);
        let mut cancelled = auction.clone();
        cancelled.state = TransactionState::Cancelled;
        storage::auction_store::set_auction(env, &cancelled);
        return Ok(ExecutionResult {
            transaction_id: auction.auction_id,
            nft_transferred: true,
            funds_distributed: false,
        });
    }
    let platform_fee = {
        let sale = SaleTransaction {
            transaction_id: auction.auction_id,
            seller: auction.seller.clone(),
            buyer: Some(winner.clone()),
            nft_address: auction.nft_address.clone(),
            token_id: auction.token_id,
            price: auction.highest_bid,
            currency: auction.currency.clone(),
            state: TransactionState::Pending,
            created_at: auction.start_time,
            expires_at: auction.end_time,
            escrow_address: env.current_contract_address(),
            royalty_info: RoyaltyDistribution {
                creator_address: auction.seller.clone(),
                creator_percentage: 0,
                seller_percentage: 0,
                platform_percentage: fee_manager::get_fee_config(env)?.platform_fee_bps,
                total_amount: auction.highest_bid,
                amounts: Map::new(env),
            },
            platform_fee: 0,
        };
        fee_manager::take_platform_fee(env, &sale)?
    };

    let seller_amount = auction.highest_bid - platform_fee;
    if seller_amount > 0 {
        escrow_manager::transfer_out(env, &auction.currency, &auction.seller, seller_amount)?;
    }
    fee_manager::add_platform_fee(env, &auction.currency, platform_fee)?;

    let nft_client = NftClient::new(env, &auction.nft_address);
    nft_client.transfer(&env.current_contract_address(), &winner, &auction.token_id);

    Ok(ExecutionResult {
        transaction_id: auction.auction_id,
        nft_transferred: true,
        funds_distributed: true,
    })
}

pub(crate) fn distribute_transaction_inner(env: &Env, transaction_id: u64) -> Result<DistributionResult, SettlementError> {
    let mut sale = storage::transaction_store::get_sale(env, transaction_id)?;
    if sale.state != TransactionState::Funded {
        return Err(SettlementError::InvalidState);
    }
    let distribution = royalty_distributor::distribute_funds(env, &sale)?;
    sale.platform_fee = distribution.platform_fee;
    sale.state = TransactionState::Executed;
    storage::transaction_store::set_sale(env, &sale);
    Ok(distribution)
}

pub fn next_sale_id(env: &Env) -> Result<u64, SettlementError> {
    let mut counters: Counters = env
        .storage()
        .persistent()
        .get(&DataKey::Counters)
        .ok_or(SettlementError::NotInitialized)?;
    counters.sale += 1;
    env.storage()
        .persistent()
        .set(&DataKey::Counters, &counters);
    Ok(counters.sale)
}

pub fn next_auction_id(env: &Env) -> Result<u64, SettlementError> {
    let mut counters: Counters = env
        .storage()
        .persistent()
        .get(&DataKey::Counters)
        .ok_or(SettlementError::NotInitialized)?;
    counters.auction += 1;
    env.storage()
        .persistent()
        .set(&DataKey::Counters, &counters);
    Ok(counters.auction)
}

pub fn next_dispute_id(env: &Env) -> Result<u64, SettlementError> {
    let mut counters: Counters = env
        .storage()
        .persistent()
        .get(&DataKey::Counters)
        .ok_or(SettlementError::NotInitialized)?;
    counters.dispute += 1;
    env.storage()
        .persistent()
        .set(&DataKey::Counters, &counters);
    Ok(counters.dispute)
}

fn validate_fee_config(config: &FeeConfig) -> Result<(), SettlementError> {
    if config.platform_fee_bps > 10_000 {
        return Err(SettlementError::InvalidAmount);
    }
    if config.minimum_fee < 0 || config.maximum_fee < 0 {
        return Err(SettlementError::InvalidAmount);
    }
    Ok(())
}
