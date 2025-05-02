mod modules{
    pub mod logic;
    pub mod access_control;
    pub mod view;
    pub mod transaction;
}
mod storage {
    pub mod storage;
    pub mod transaction_storage;
}
mod events {
    pub mod events;
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
