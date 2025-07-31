mod modules {
    pub mod logic;
    pub mod access_control;
    pub mod view;
    pub mod nft_contract;
    pub mod transaction;
    pub mod royalty_contract;
    pub mod reentrancy_guard;
    pub mod royalty {
        pub mod logic;
        pub mod interfaces;
    }
    pub mod marketplace {
        pub mod settlement;
    }
    pub mod paymaster {
        pub mod main;
        pub mod logic;
        pub mod interfaces;
        pub mod validation;
    }
}
mod storage {
    pub mod storage;
    pub mod transaction_storage;
    pub mod escrow_storage;
    pub mod royalty_storage;
    pub mod paymaster_storage;
}
mod events {
    pub mod events;
    pub mod nft_events;
    pub mod transaction_events;
    pub mod royalty_events;
    pub mod paymaster_events;
}
mod interfaces {
    pub mod collection_factory;
    pub mod INFI;
    pub mod escrow_interfaces;
    pub mod reentrancy_interfaces;  
}
mod utils {
    pub mod helpers;
}
mod contracts {
    pub mod collection_factory;
    pub mod nft_contract;
    pub mod escrow_contract;
}

pub mod transaction {
    use crate::modules::transaction::*;
}

pub mod nft_contract {
    use crate::modules::nft_contract::*;
}

mod gas_estimation {
    pub mod core;
    pub mod interfaces;
}
