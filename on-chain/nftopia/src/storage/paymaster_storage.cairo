#[starknet::contract]
mod PaymasterStorage {
    use starknet::ContractAddress;
    use starknet::storage::Map;

    
   #[storage]
   pub struct Storage {
        token_rates: Map::<ContractAddress, u256>,
        collected_fees: Map::<ContractAddress, u256>,
        is_paused: bool,
        rate_update_delay: u64
    }
}