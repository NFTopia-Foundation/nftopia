use soroban_sdk::{contracterror, Symbol, Env};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    // Factory errors (1000-1999)
    Unauthorized = 1000,
    InvalidConfig = 1001,
    CollectionLimitReached = 1002,
    InsufficientFee = 1003,
    CollectionNotFound = 1004,
    CollectionAlreadyExists = 1005,
    AlreadyInitialized = 1006, // ADD THIS

    // Collection errors (2000-2999)
    MaxSupplyExceeded = 2000,
    TokenNotFound = 2001,
    NotTokenOwner = 2002,
    NotApprovedForAll = 2003,
    MintingPaused = 2004,
    WhitelistRequired = 2005,
    InvalidTokenId = 2006,
    InvalidRoyaltyPercentage = 2007,
    NotApproved = 2008, // ADD THIS - used in collection.rs

    // General errors (3000-3999)
    InvalidInput = 3000,
    Overflow = 3001,
    Underflow = 3002,
    StorageError = 3003,
    TransferFailed = 3004,
}

impl Error {
    pub fn to_symbol(&self, env: &Env) -> Symbol {
        match self {
            Error::Unauthorized => Symbol::new(env, "UNAUTHORIZED"),
            Error::InvalidConfig => Symbol::new(env, "INVALID_CONFIG"),
            Error::CollectionLimitReached => Symbol::new(env, "COLLECTION_LIMIT_REACHED"),
            Error::InsufficientFee => Symbol::new(env, "INSUFFICIENT_FEE"),
            Error::CollectionNotFound => Symbol::new(env, "COLLECTION_NOT_FOUND"),
            Error::CollectionAlreadyExists => Symbol::new(env, "COLLECTION_ALREADY_EXISTS"),
            Error::AlreadyInitialized => Symbol::new(env, "ALREADY_INITIALIZED"), // ADD THIS
            Error::MaxSupplyExceeded => Symbol::new(env, "MAX_SUPPLY_EXCEEDED"),
            Error::TokenNotFound => Symbol::new(env, "TOKEN_NOT_FOUND"),
            Error::NotTokenOwner => Symbol::new(env, "NOT_TOKEN_OWNER"),
            Error::NotApprovedForAll => Symbol::new(env, "NOT_APPROVED_FOR_ALL"),
            Error::NotApproved => Symbol::new(env, "NOT_APPROVED"), // ADD THIS
            Error::MintingPaused => Symbol::new(env, "MINTING_PAUSED"),
            Error::WhitelistRequired => Symbol::new(env, "WHITELIST_REQUIRED"),
            Error::InvalidTokenId => Symbol::new(env, "INVALID_TOKEN_ID"),
            Error::InvalidRoyaltyPercentage => Symbol::new(env, "INVALID_ROYALTY_PERCENTAGE"),
            Error::InvalidInput => Symbol::new(env, "INVALID_INPUT"),
            Error::Overflow => Symbol::new(env, "OVERFLOW"),
            Error::Underflow => Symbol::new(env, "UNDERFLOW"),
            Error::StorageError => Symbol::new(env, "STORAGE_ERROR"),
            Error::TransferFailed => Symbol::new(env, "TRANSFER_FAILED"),
        }
    }
}