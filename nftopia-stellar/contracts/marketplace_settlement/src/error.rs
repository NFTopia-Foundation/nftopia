use soroban_sdk::contracttype;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SettlementError {
    Unauthorized,
    NotInitialized,
    NotFound,
    InvalidState,
    InvalidAmount,
    InvalidTime,
    Expired,
    AuctionNotEnded,
    BidTooLow,
    CommitmentMismatch,
    AlreadyExists,
    Overflow,
}
