// SPDX-License-Identifier: MIT
// Escrow contract tests for NFT/STRK swaps

use starknet::testing::contract_address;
use starknet::testing::deploy_contract;
use starknet::testing::call_contract;
use starknet::testing::invoke_contract;
use starknet::testing::get_balance;
use starknet::testing::set_block_timestamp;
use starknet::contract_address::ContractAddress;
use core::integer::u256_from_felt252;
use core::integer::u256_add;
use core::integer::u256_eq;
use core::array::ArrayTrait;
use snforge_std::{ContractClassTrait, DeclareResultTrait, declare};
use nftopia::IEscrowDispatcher;

const ESCROW_CONTRACT_PATH: felt252 = 'src/contracts/escrow_contract.cairo';

#[cfg(test)]
mod tests {
    use snforge_std::{declare, ContractClassTrait, deploy, Contract, assert};
    use starknet::contract_address::ContractAddress;

    #[test]
    fn test_create_swap() {
        let contract_address = deploy_contract("EscrowContract");
        let dispatcher = IEscrowDispatcher { contract_address };

        // Prepare test data
        let nft_contract = ContractAddress::from(1234);
        let nft_id = 1;
        let price = 100;
        let expiry = 5000;

        // Call create_swap
        let swap_id = dispatcher.create_swap(nft_contract, nft_id, price, expiry);

        // Check swap count
        let swap_count = dispatcher.get_swap_count();
        assert(swap_count == 1, 'Swap count should be 1');
    }
}

#[test]
fn test_accept_swap() {
    let (escrow_addr, _) = deploy_contract(ESCROW_CONTRACT_PATH, (), ());
    set_block_timestamp(1000);
    let nft_contract = contract_address(1234);
    let nft_id = 1_u256;
    let price = 100_u256;
    let expiry = 1000_u64 + 4000_u64;
    let (swap_id,) = call_contract(escrow_addr, 'create_swap', (nft_contract, nft_id, price, expiry));
    // Accept swap as a different caller
    // (simulate by changing caller context if needed)
    let _ = invoke_contract(escrow_addr, 'accept_swap', (swap_id,));
    // Check status
    let (creator, nft_contract, nft_id, price, expiry, status) = call_contract(escrow_addr, 'get_swap', (swap_id,));
    assert(status == 1, 'Swap should be completed');
}

#[test]
fn test_cancel_swap() {
    let (escrow_addr, _) = deploy_contract(ESCROW_CONTRACT_PATH, (), ());
    set_block_timestamp(1000);
    let nft_contract = contract_address(1234);
    let nft_id = 1_u256;
    let price = 100_u256;
    let expiry = 1000_u64 + 4000_u64;
    let (swap_id,) = call_contract(escrow_addr, 'create_swap', (nft_contract, nft_id, price, expiry));
    // Cancel swap
    let _ = invoke_contract(escrow_addr, 'cancel_swap', (swap_id,));
    // Check status
    let (creator, nft_contract, nft_id, price, expiry, status) = call_contract(escrow_addr, 'get_swap', (swap_id,));
    assert(status == 2, 'Swap should be cancelled');
}

// Helper function to deploy the contract
fn deploy_contract(name: felt252) -> ContractAddress {
    let contract = declare(name).unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@ArrayTrait::new()).unwrap();
    contract_address
} 