#[feature("deprecated_legacy_map")]
#[starknet::contract]
mod PaymasterStorage {
    use starknet::ContractAddress;
    
    #[storage]
   pub struct Storage {
        token_rates: LegacyMap::<ContractAddress, u256>,
        collected_fees: LegacyMap::<ContractAddress, u256>,
        is_paused: bool,
        rate_update_delay: u64
    }
}