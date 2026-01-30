use soroban_sdk::{
    contractevent,
    Address,
    String,
    Vec,
};

#[contractevent]
#[derive(Clone, Debug)]
pub enum Event {
    // ─────────────────────────────────────────────
    // Factory events
    // ─────────────────────────────────────────────
    CollectionCreated(
        Address, // creator
        u64,     // collection_id
        Address, // collection_address
        String,  // name
        String,  // symbol
    ),

    FactoryFeeUpdated(
        i128,    // old_fee
        i128,    // new_fee
        Address, // updater
    ),

    FeesWithdrawn(
        Address, // recipient
        i128,    // amount
    ),

    // ─────────────────────────────────────────────
    // Collection events
    // ─────────────────────────────────────────────
    TokenMinted(
        Address, // collection
        u32,     // token_id
        Address, // owner
        String,  // uri
    ),

    BatchMinted(
        Address, // collection
        u32,     // start_token_id
        u32,     // count
        Address, // owner
    ),

    TokenTransferred(
        Address, // collection
        u32,     // token_id
        Address, // from
        Address, // to
    ),

    BatchTransferred(
        Address,     // collection
        Vec<u32>,    // token_ids
        Address,     // from
        Address,     // to
    ),

    TokenBurned(
        Address, // collection
        u32,     // token_id
        Address, // owner
    ),

    RoyaltyUpdated(
        Address, // collection
        Address, // recipient
        u32,     // percentage
    ),

    WhitelistUpdated(
        Address, // collection
        Address, // address
        bool,    // added
    ),

    CollectionPaused(
        Address, // collection
        bool,    // paused
    ),
}
