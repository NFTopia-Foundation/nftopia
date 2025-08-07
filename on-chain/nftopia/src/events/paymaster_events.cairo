use starknet::ContractAddress;

#[event]
#[derive(Drop, starknet::Event)]
pub enum PaymasterEvents {
    TransactionSponsored: TransactionSponsored,
    RateUpdated: RateUpdated,
    FeesWithdrawn: FeesWithdrawn
}

#[derive(Drop, starknet::Event)]
pub struct TransactionSponsored {
    user: ContractAddress,
    token: ContractAddress,
    amount: u256
}

#[derive(Drop, starknet::Event)]
pub struct RateUpdated {
    token: ContractAddress,
    new_rate: u256
}

#[derive(Drop, starknet::Event)]
pub struct FeesWithdrawn {
    token: ContractAddress,
    amount: u256,
    recipient: ContractAddress
}