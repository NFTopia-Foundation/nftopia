use starknet::ContractAddress;

#[storage]
pub struct Storage {
    marketplace_address: ContractAddress,
    payment_token: ContractAddress,
}
