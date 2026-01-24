use soroban_sdk::{contracttype, Address, Env, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Event {
    // Factory events
    CollectionCreated {
        creator: Address,
        collection_id: u64,
        collection_address: Address,
        name: String,
        symbol: String,
    },
    FactoryFeeUpdated {
        old_fee: i128,
        new_fee: i128,
        updater: Address,
    },
    FeesWithdrawn {
        recipient: Address,
        amount: i128,
    },
    
    // Collection events
    TokenMinted {
        collection: Address,
        token_id: u32,
        owner: Address,
        uri: String,
    },
    BatchMinted {
        collection: Address,
        start_token_id: u32,
        count: u32,
        owner: Address,
    },
    TokenTransferred {
        collection: Address,
        token_id: u32,
        from: Address,
        to: Address,
    },
    BatchTransferred {
        collection: Address,
        token_ids: Vec<u32>,
        from: Address,
        to: Address,
    },
    TokenBurned {
        collection: Address,
        token_id: u32,
        owner: Address,
    },
    RoyaltyUpdated {
        collection: Address,
        recipient: Address,
        percentage: u32,
    },
    WhitelistUpdated {
        collection: Address,
        address: Address,
        added: bool,
    },
    CollectionPaused {
        collection: Address,
        paused: bool,
    },
}

impl Event {
    pub fn publish(&self, env: &Env) {
        env.events().publish(
            (Symbol::new(env, "nftopia_event"), self.clone()),
            self.clone(),
        );
    }
}