#[feature("deprecated_legacy_map")]
#[starknet::contract]
mod RoyaltyStorage {
    use starknet::ContractAddress;
    use starknet::get_caller_address;


struct RoyaltySnapshot {
    receiver: ContractAddress,
    amount: u256,
    timestamp: u64
}

    #[storage]
    struct Storage {
        default_receiver: ContractAddress,
        default_fee_bps: u16,        
        token_royalty_receiver: LegacyMap::<u256, ContractAddress>,
        token_royalty_bps: LegacyMap::<u256, u16>,
        royalty_snapshots: LegacyMap::<u256, Array<RoyaltySnapshot>>
    }
}
