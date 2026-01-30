use soroban_sdk::{Address, BytesN, Env, Vec};

use crate::error::SettlementError;
use crate::escrow_manager;
use crate::security::frontrun_protection;
use crate::storage::auction_store;
use crate::utils::time_utils::now;
use crate::{AuctionTransaction, Bid, TransactionState};

pub fn place_bid(
    env: &Env,
    auction_id: u64,
    bidder: Address,
    bid_amount: i128,
    commitment_hash: Option<BytesN<32>>,
) -> Result<(), SettlementError> {
    let mut auction = auction_store::get_auction(env, auction_id)?;
    if auction.state != TransactionState::Pending {
        return Err(SettlementError::InvalidState);
    }
    let current_time = now(env);
    if current_time < auction.start_time || current_time > auction.end_time {
        return Err(SettlementError::InvalidTime);
    }
    let is_committed = commitment_hash.is_some();
    if bid_amount <= 0 && !is_committed {
        return Err(SettlementError::InvalidAmount);
    }
    if !is_committed {
        ensure_valid_bid(&auction, bid_amount)?;
        escrow_manager::transfer_in(env, &auction.currency, &bidder, bid_amount)?;
        if let Some(prev_bidder) = auction.highest_bidder.clone() {
            if auction.highest_bid > 0 {
                escrow_manager::transfer_out(env, &auction.currency, &prev_bidder, auction.highest_bid)?;
            }
        }
        auction.highest_bid = bid_amount;
        auction.highest_bidder = Some(bidder.clone());
        maybe_extend_auction(&mut auction, current_time);
    }

    let bid = Bid {
        bidder,
        amount: if is_committed { 0 } else { bid_amount },
        placed_at: current_time,
        is_committed,
        commitment_hash,
    };
    auction.bids.push_back(bid);
    auction_store::set_auction(env, &auction);
    Ok(())
}

pub fn reveal_bid(
    env: &Env,
    auction_id: u64,
    bidder: Address,
    bid_amount: i128,
    salt: BytesN<32>,
) -> Result<(), SettlementError> {
    let mut auction = auction_store::get_auction(env, auction_id)?;
    if auction.state != TransactionState::Pending {
        return Err(SettlementError::InvalidState);
    }
    let current_time = now(env);
    if current_time < auction.start_time || current_time > auction.end_time {
        return Err(SettlementError::InvalidTime);
    }
    ensure_valid_bid(&auction, bid_amount)?;

    let mut commitment: Option<BytesN<32>> = None;
    for bid in auction.bids.iter() {
        if bid.is_committed && bid.bidder == bidder {
            commitment = bid.commitment_hash;
        }
    }
    let stored_commitment = commitment.ok_or(SettlementError::NotFound)?;
    let computed = frontrun_protection::compute_commitment(env, &bidder, bid_amount, &salt);
    if stored_commitment != computed {
        return Err(SettlementError::CommitmentMismatch);
    }

    escrow_manager::transfer_in(env, &auction.currency, &bidder, bid_amount)?;
    if let Some(prev_bidder) = auction.highest_bidder.clone() {
        if auction.highest_bid > 0 {
            escrow_manager::transfer_out(env, &auction.currency, &prev_bidder, auction.highest_bid)?;
        }
    }
    auction.highest_bid = bid_amount;
    auction.highest_bidder = Some(bidder);
    maybe_extend_auction(&mut auction, current_time);

    auction_store::set_auction(env, &auction);
    Ok(())
}

pub fn finalize_auction(env: &Env, auction_id: u64) -> Result<AuctionTransaction, SettlementError> {
    let mut auction = auction_store::get_auction(env, auction_id)?;
    if auction.state != TransactionState::Pending {
        return Err(SettlementError::InvalidState);
    }
    let current_time = now(env);
    if current_time < auction.end_time {
        return Err(SettlementError::AuctionNotEnded);
    }
    auction.state = TransactionState::Executed;
    auction_store::set_auction(env, &auction);
    Ok(auction)
}

pub fn cancel_auction(env: &Env, auction_id: u64) -> Result<AuctionTransaction, SettlementError> {
    let mut auction = auction_store::get_auction(env, auction_id)?;
    if auction.state != TransactionState::Pending {
        return Err(SettlementError::InvalidState);
    }
    auction.state = TransactionState::Cancelled;
    auction_store::set_auction(env, &auction);
    Ok(auction)
}

fn ensure_valid_bid(auction: &AuctionTransaction, bid_amount: i128) -> Result<(), SettlementError> {
    if bid_amount < auction.starting_price {
        return Err(SettlementError::BidTooLow);
    }
    if auction.highest_bid > 0 {
        let min_bid = auction
            .highest_bid
            .checked_add(auction.bid_increment)
            .ok_or(SettlementError::Overflow)?;
        if bid_amount < min_bid {
            return Err(SettlementError::BidTooLow);
        }
    }
    if auction.reserve_price > 0 && bid_amount < auction.reserve_price {
        return Err(SettlementError::BidTooLow);
    }
    Ok(())
}

fn maybe_extend_auction(auction: &mut AuctionTransaction, now: u64) {
    if auction.extension_window == 0 {
        return;
    }
    if auction.end_time > now && auction.end_time - now <= auction.extension_window {
        auction.end_time += auction.extension_window;
    }
}
