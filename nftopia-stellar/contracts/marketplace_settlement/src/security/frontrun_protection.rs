use soroban_sdk::{BytesN, Env};

pub fn compute_commitment(env: &Env, _bidder: &soroban_sdk::Address, bid_amount: i128, salt: &BytesN<32>) -> BytesN<32> {
    let mut data = soroban_sdk::Bytes::new(env);
    data.append(&bid_amount.to_be_bytes());
    data.append(&salt.clone().into());
    env.crypto().sha256(&data)
}
