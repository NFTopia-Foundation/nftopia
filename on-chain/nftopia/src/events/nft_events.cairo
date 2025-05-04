/// Events for the NFT Contract Module
use starknet::ContractAddress;
use core::byte_array::ByteArray;

/// Event emitted when a new token is minted
#[derive(Drop, starknet::Event, Serde)]
pub struct Mint {
    pub token_id: u256,
    pub to: ContractAddress,
    pub creator: ContractAddress,
    pub uri: ByteArray,
    pub collection: ContractAddress,
}

/// Event emitted when a token is transferred
#[derive(Drop, starknet::Event, Serde)]
pub struct Transfer {
    pub from: ContractAddress,
    pub to: ContractAddress,
    pub token_id: u256,
}

/// Event emitted when approval is given to an address for a specific token
#[derive(Drop, starknet::Event, Serde)]
pub struct Approval {
    pub owner: ContractAddress,
    pub approved: ContractAddress,
    pub token_id: u256,
}

/// Event emitted when an operator is approved or disapproved for all tokens of an owner
#[derive(Drop, starknet::Event, Serde)]
pub struct ApprovalForAll {
    pub owner: ContractAddress,
    pub operator: ContractAddress,
    pub approved: bool,
}
