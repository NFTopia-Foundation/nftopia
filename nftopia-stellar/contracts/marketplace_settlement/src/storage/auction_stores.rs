use soroban_sdk::Env;

use crate::{error::SettlementError, AuctionTransaction, DataKey};

pub fn get_auction(env: &Env, auction_id: u64) -> Result<AuctionTransaction, SettlementError> {
    env.storage()
        .persistent()
        .get(&DataKey::Auction(auction_id))
        .ok_or(SettlementError::NotFound)
}

pub fn set_auction(env: &Env, auction: &AuctionTransaction) {
    env.storage()
        .persistent()
        .set(&DataKey::Auction(auction.auction_id), auction);
}
