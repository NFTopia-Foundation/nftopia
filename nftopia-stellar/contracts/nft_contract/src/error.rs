use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Eq, PartialEq)]
pub enum ContractError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    TokenNotFound = 4,
    NotOwner = 5,
    NotApproved = 6,
    TransferPaused = 7,
    MintPaused = 8,
    MetadataFrozen = 9,
    InvalidInput = 10,
    MaxSupplyReached = 11,
    RoyaltyTooHigh = 12,
    ConfirmRequired = 13,
    ArrayLengthMismatch = 14,
    WhitelistRequired = 15,
    RevealNotReady = 16,
}
