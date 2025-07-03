mod modules {
    pub mod logic;
    pub mod access_control;
    pub mod view;
    pub mod nft_contract;
    pub mod transaction;
    pub mod royalty_contract;
}
mod storage {
    pub mod storage;
    pub mod transaction_storage;
}
mod events {
    pub mod events;
    pub mod nft_events;
    pub mod transaction_events;
}
mod interfaces {
    pub mod collection_factory;
    pub mod INFI;
}
mod utils {
    pub mod helpers;
}
mod contracts {
    pub mod collection_factory;
    pub mod nft_contract;
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
