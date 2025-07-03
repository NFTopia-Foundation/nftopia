
pub fn estimate_royalty_gas(nft_id: felt252, sale_price: u128) -> u128 {
    // Basic mock logic: 5000 base + 1 unit per 10,000 wei
    let base_gas = 5000_u128;
    let dynamic_gas = sale_price / 10_000_u128;
    base_gas + dynamic_gas
}




