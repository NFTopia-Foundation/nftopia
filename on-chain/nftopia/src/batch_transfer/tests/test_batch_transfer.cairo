use starknet::ContractAddress;
use starknet::testing::{set_caller_address, set_contract_address};
use snforge_std::{declare, ContractClassTrait, contract_address_const};

use nftopia::modules::batch_transfer::IBatchTransferDispatcher;
use nftopia::modules::batch_transfer::IBatchTransferDispatcherTrait;
use nftopia::modules::nft_contract::INftContractDispatcher;
use nftopia::modules::nft_contract::INftContractDispatcherTrait;

// Test constants
const ADMIN: felt252 = 0x123;
const USER1: felt252 = 0x456;
const USER2: felt252 = 0x789;
const NFT_CONTRACT: felt252 = 0xabc;

#[test]
fn test_batch_transfer_basic() {
    // Setup
    let batch_transfer = deploy_batch_transfer();
    let nft_contract = deploy_nft_contract();

    // Test basic batch transfer
    let recipients = array![USER1, USER2];
    let token_ids = array![1, 2];
    let amounts = array![1, 1];
    let contract_addresses = array![NFT_CONTRACT, NFT_CONTRACT];

    let batch_id = batch_transfer
        .batch_transfer(recipients, token_ids, amounts, contract_addresses);
    assert(batch_id > 0, 'Batch ID should be generated');
}

#[test]
fn test_batch_transfer_max_size() {
    let batch_transfer = deploy_batch_transfer();

    // Test maximum batch size (50)
    let max_size = batch_transfer.get_max_batch_size();
    assert(max_size == 50, 'Max batch size should be 50');
}

#[test]
fn test_batch_transfer_gas_estimation() {
    let batch_transfer = deploy_batch_transfer();

    let recipients = array![USER1, USER2];
    let token_ids = array![1, 2];
    let amounts = array![1, 1];
    let contract_addresses = array![NFT_CONTRACT, NFT_CONTRACT];

    let estimated_gas = batch_transfer
        .estimate_batch_transfer_gas(recipients, token_ids, amounts, contract_addresses);
    assert(estimated_gas > 0, 'Gas estimation should be positive');
}

#[test]
fn test_batch_transfer_gas_savings() {
    let batch_transfer = deploy_batch_transfer();

    let batch_size = 5;
    let total_gas_used = 150000;
    let savings = batch_transfer.calculate_gas_savings(batch_size, total_gas_used);

    // Should show some gas savings
    assert(savings > 0, 'Should show gas savings');
}

#[test]
fn test_batch_transfer_validation() {
    let batch_transfer = deploy_batch_transfer();

    // Test with mismatched array lengths
    let recipients = array![USER1, USER2];
    let token_ids = array![1]; // Mismatched length

    // This should fail
    let result = batch_transfer
        .batch_transfer(recipients, token_ids, array![1, 1], array![NFT_CONTRACT, NFT_CONTRACT]);
    // Test will fail due to validation
}

#[test]
fn test_batch_transfer_empty_batch() {
    let batch_transfer = deploy_batch_transfer();

    // Test with empty batch
    let empty_array = array![];

    // This should fail
    let result = batch_transfer.batch_transfer(empty_array, empty_array, empty_array, empty_array);
    // Test will fail due to validation
}

#[test]
fn test_batch_transfer_supported_contract() {
    let batch_transfer = deploy_batch_transfer();

    // Test contract support check
    let is_supported = batch_transfer.is_batch_transfer_supported(NFT_CONTRACT);
    // Initially should be false until added by admin
    assert(!is_supported, 'Contract should not be supported initially');
}

// Helper functions
fn deploy_batch_transfer() -> IBatchTransferDispatcher {
    let contract = declare('BatchTransfer');
    let contract_address = contract.deploy(@ArrayTrait::new()).unwrap();
    IBatchTransferDispatcher { contract_address }
}

fn deploy_nft_contract() -> INftContractDispatcher {
    let contract = declare('NftContract');
    let contract_address = contract.deploy(@ArrayTrait::new()).unwrap();
    INftContractDispatcher { contract_address }
}
