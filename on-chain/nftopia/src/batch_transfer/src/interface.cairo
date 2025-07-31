/// Interface for the Batch Transfer Module
use starknet::ContractAddress;

#[starknet::interface]
pub trait IBatchTransfer<TContractState> {
    // Core batch transfer function
    fn batch_transfer(
        ref self: TContractState,
        recipients: Array<ContractAddress>,
        token_ids: Array<u256>,
        amounts: Array<u256>,
        contract_addresses: Array<ContractAddress>,
    ) -> u256;

    // Gas estimation functions
    fn estimate_batch_transfer_gas(
        self: @TContractState,
        recipients: Array<ContractAddress>,
        token_ids: Array<u256>,
        amounts: Array<u256>,
        contract_addresses: Array<ContractAddress>,
    ) -> u128;

    fn estimate_individual_transfer_gas(
        self: @TContractState, token_id: u256, contract_address: ContractAddress,
    ) -> u128;

    // View functions
    fn get_batch_id(self: @TContractState) -> u256;
    fn get_max_batch_size(self: @TContractState) -> u32;
    fn is_batch_transfer_supported(
        self: @TContractState, contract_address: ContractAddress,
    ) -> bool;

    // Utility functions
    fn calculate_gas_savings(self: @TContractState, batch_size: u32, total_gas_used: u128) -> u32;
}
