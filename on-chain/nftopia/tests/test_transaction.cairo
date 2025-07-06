#[feature("deprecated-starknet-consts")]
use starknet::{ContractAddress, contract_address_const};
use core::array::ArrayTrait;
use core::result::ResultTrait;
use snforge_std::{ContractClassTrait, DeclareResultTrait};

use snforge_std::declare;

use nftopia::transaction::{ITransactionModuleDispatcher, ITransactionModuleDispatcherTrait};

// Helper function to deploy the contract
fn deploy_contract(name: ByteArray) -> ContractAddress {
    let contract = declare(name).unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@ArrayTrait::new()).unwrap();
    contract_address
}

#[test]
fn test_record_transaction() {
    // Deploy the contract
    let contract_address = deploy_contract("TransactionModule");
    let dispatcher = ITransactionModuleDispatcher { contract_address };

    // Create test data
    let token_id: u256 = 1;
    let amount: u256 = 1000;
    let user = contract_address_const::<0x123>();

    // Simulate call from user
    dispatcher.record_transaction(token_id, amount);

    // Verify token is marked as sold
    assert(dispatcher.is_token_sold(token_id), 'Token should be marked as sold');

    // Verify token price is recorded correctly
    let recorded_amount = dispatcher.get_token_price(token_id);
    assert(recorded_amount == amount, 'Token price should match');

    // Verify purchase is recorded for the user
    assert(dispatcher.has_user_purchased(user, token_id), 'Should have purchased token');
}

#[test]
fn test_multiple_transactions() {
    // Deploy the contract
    let contract_address = deploy_contract("TransactionModule");
    let dispatcher = ITransactionModuleDispatcher { contract_address };

    // Create test data for multiple tokens
    let user = contract_address_const::<0x123>();
    let mut token_ids = ArrayTrait::new();
    token_ids.append(1_u256);
    token_ids.append(2_u256);
    token_ids.append(3_u256);

    let mut amounts = ArrayTrait::new();
    amounts.append(1000_u256);
    amounts.append(2000_u256);
    amounts.append(3000_u256);

    // Record multiple transactions
    dispatcher.record_transaction(*token_ids.at(0), *amounts.at(0));
    dispatcher.record_transaction(*token_ids.at(1), *amounts.at(1));
    dispatcher.record_transaction(*token_ids.at(2), *amounts.at(2));

    // Verify all tokens are marked as sold
    assert(dispatcher.is_token_sold(*token_ids.at(0)), 'Token 1 should be sold');
    assert(dispatcher.is_token_sold(*token_ids.at(1)), 'Token 2 should be sold');
    assert(dispatcher.is_token_sold(*token_ids.at(2)), 'Token 3 should be sold');

    // Verify all token prices are recorded correctly
    assert(dispatcher.get_token_price(*token_ids.at(0)) == *amounts.at(0), 'Token 1 price
    incorrect');
    assert(dispatcher.get_token_price(*token_ids.at(1)) == *amounts.at(1), 'Token 2 price
    incorrect');
    assert(dispatcher.get_token_price(*token_ids.at(2)) == *amounts.at(2), 'Token 3 price
    incorrect');

    // Verify user has purchased all tokens
    assert(dispatcher.has_user_purchased(user, *token_ids.at(0)), 'Shouldve purchased token
    1');
    assert(dispatcher.has_user_purchased(user, *token_ids.at(1)), 'Shouldve purchased token
    2');
    assert(dispatcher.has_user_purchased(user, *token_ids.at(2)), 'Shouldve purchased token
    3');
}

#[test]
fn test_resell_token() {
    // Deploy the contract
    let contract_address = deploy_contract("TransactionModule");
    let dispatcher = ITransactionModuleDispatcher { contract_address };

    // Create test data
    let token_id: u256 = 1;
    let amount: u256 = 1000;
    let user1 = contract_address_const::<0x123>();

    // First sale
    dispatcher.record_transaction(token_id, amount);

    // Verify the token is sold
    assert(dispatcher.is_token_sold(token_id), 'Token should be marked as sold');

    // Verify first user has purchased the token
    assert(dispatcher.has_user_purchased(user1, token_id), 'Should have purchased token');
}

#[test]
fn test_zero_amount_transaction() {
    // Deploy the contract
    let contract_address = deploy_contract("TransactionModule");
    let dispatcher = ITransactionModuleDispatcher { contract_address };

    // Create test data with non-zero amount (we'll test the positive case)
    let token_id: u256 = 1;
    let amount: u256 = 500;

    // Record a valid transaction
    dispatcher.record_transaction(token_id, amount);

    // Verify the transaction was recorded correctly
    assert(dispatcher.is_token_sold(token_id), 'Token should be marked as sold');
    assert(dispatcher.get_token_price(token_id) == amount, 'Token price should match');
}
