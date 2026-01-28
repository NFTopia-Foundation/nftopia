use soroban_sdk::{Address, Env, Map, String, Vec};

use crate::error::SettlementError;
use crate::storage::{auction_store, dispute_store, transaction_store};
use crate::utils::time_utils::now;
use crate::{
    escrow_manager, Dispute, DisputeResolution, TransactionState,
};
use crate::NftClient;

pub fn initiate_dispute(
    env: &Env,
    transaction_id: u64,
    initiator: Address,
    reason: String,
    evidence_uri: Option<String>,
    arbitrators: Vec<Address>,
    required_votes: u32,
) -> Result<Dispute, SettlementError> {
    if arbitrators.is_empty() || required_votes == 0 || required_votes as usize > arbitrators.len() as usize {
        return Err(SettlementError::InvalidAmount);
    }
    if let Ok(mut sale) = transaction_store::get_sale(env, transaction_id) {
        if sale.state != TransactionState::Pending {
            return Err(SettlementError::InvalidState);
        }
        if initiator != sale.seller {
            if let Some(buyer) = sale.buyer.clone() {
                if initiator != buyer {
                    return Err(SettlementError::Unauthorized);
                }
            } else {
                return Err(SettlementError::Unauthorized);
            }
        }
        sale.state = TransactionState::Disputed;
        transaction_store::set_sale(env, &sale);
    } else if let Ok(mut auction) = auction_store::get_auction(env, transaction_id) {
        if auction.state != TransactionState::Pending {
            return Err(SettlementError::InvalidState);
        }
        if initiator != auction.seller {
            if let Some(highest) = auction.highest_bidder.clone() {
                if initiator != highest {
                    return Err(SettlementError::Unauthorized);
                }
            } else {
                return Err(SettlementError::Unauthorized);
            }
        }
        auction.state = TransactionState::Disputed;
        auction_store::set_auction(env, &auction);
    } else {
        return Err(SettlementError::NotFound);
    }

    let dispute_id = crate::next_dispute_id(env)?;
    let dispute = Dispute {
        dispute_id,
        transaction_id,
        initiator,
        reason,
        evidence_uri,
        arbitrators,
        votes: Map::new(env),
        required_votes,
        created_at: now(env),
        resolved_at: None,
        resolution: None,
    };
    dispute_store::set_dispute(env, &dispute);
    Ok(dispute)
}

pub fn vote_on_dispute(
    env: &Env,
    dispute_id: u64,
    voter: Address,
    vote: bool,
) -> Result<Dispute, SettlementError> {
    let mut dispute = dispute_store::get_dispute(env, dispute_id)?;
    if dispute.resolution.is_some() {
        return Err(SettlementError::InvalidState);
    }
    let mut is_arbitrator = false;
    for arbitrator in dispute.arbitrators.iter() {
        if arbitrator == voter {
            is_arbitrator = true;
        }
    }
    if !is_arbitrator {
        return Err(SettlementError::Unauthorized);
    }
    dispute.votes.set(&voter, vote);

    let mut yes_votes = 0u32;
    let mut no_votes = 0u32;
    for entry in dispute.votes.iter() {
        if entry.1 {
            yes_votes += 1;
        } else {
            no_votes += 1;
        }
    }

    if yes_votes >= dispute.required_votes || no_votes >= dispute.required_votes {
        let resolution = if yes_votes >= dispute.required_votes {
            DisputeResolution::InitiatorWins
        } else {
            DisputeResolution::InitiatorLoses
        };
        dispute.resolution = Some(resolution.clone());
        dispute.resolved_at = Some(now(env));
        dispute_store::set_dispute(env, &dispute);
        resolve_transaction(env, dispute.transaction_id, resolution)?;
        return Ok(dispute);
    }

    dispute_store::set_dispute(env, &dispute);
    Ok(dispute)
}

fn resolve_transaction(
    env: &Env,
    transaction_id: u64,
    resolution: DisputeResolution,
) -> Result<(), SettlementError> {
    if let Ok(mut sale) = transaction_store::get_sale(env, transaction_id) {
        if sale.state != TransactionState::Disputed {
            return Err(SettlementError::InvalidState);
        }
        let nft_client = NftClient::new(env, &sale.nft_address);
        nft_client.transfer(&env.current_contract_address(), &sale.seller, &sale.token_id);
        sale.state = TransactionState::Resolved;
        transaction_store::set_sale(env, &sale);
        let _ = resolution;
        return Ok(());
    }

    if let Ok(mut auction) = auction_store::get_auction(env, transaction_id) {
        if auction.state != TransactionState::Disputed {
            return Err(SettlementError::InvalidState);
        }
        if let Some(highest_bidder) = auction.highest_bidder.clone() {
            if auction.highest_bid > 0 {
                escrow_manager::transfer_out(env, &auction.currency, &highest_bidder, auction.highest_bid)?;
            }
        }
        let nft_client = NftClient::new(env, &auction.nft_address);
        nft_client.transfer(&env.current_contract_address(), &auction.seller, &auction.token_id);
        auction.state = TransactionState::Resolved;
        auction_store::set_auction(env, &auction);
        let _ = resolution;
        return Ok(());
    }

    Err(SettlementError::NotFound)
}
