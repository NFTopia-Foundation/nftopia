use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum ContractError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    TokenNotFound = 4,
    InvalidBatchLength = 5,
    MaxSupplyReached = 6,
    MetadataFrozen = 7,
    BurnNotConfirmed = 8,
    TransfersPaused = 9,
    MintingPaused = 10,
    ContractPaused = 11,
    InvalidRoyaltyPercentage = 12,
    RevealNotReady = 13,
    InvalidSalePrice = 14,
    NotWhitelisted = 15,
    ReentrancyDetected = 16,
}
