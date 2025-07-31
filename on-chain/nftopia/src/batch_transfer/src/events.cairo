/// Events for the Batch Transfer Module
use starknet::ContractAddress;

/// Event emitted when a batch transfer is executed
/// Single event per batch for efficient logging
#[derive(Drop, starknet::Event, Serde)]
pub struct BatchTransfer {
    pub from: ContractAddress,
    pub recipients: Array<ContractAddress>,
    pub token_ids: Array<u256>,
    pub amounts: Array<u256>,
    pub contract_addresses: Array<ContractAddress>,
    pub batch_id: u256,
    pub total_gas_used: u128,
}

/// Event emitted when a batch transfer fails and is rolled back
#[derive(Drop, starknet::Event, Serde)]
pub struct BatchTransferFailed {
    pub from: ContractAddress,
    pub batch_id: u256,
    pub failure_reason: felt252,
    pub gas_used_before_failure: u128,
}

/// Event emitted for gas optimization statistics
#[derive(Drop, starknet::Event, Serde)]
pub struct BatchTransferGasOptimized {
    pub batch_size: u32,
    pub gas_saved_percentage: u32,
    pub total_gas_used: u128,
    pub individual_transfer_gas: u128,
}
