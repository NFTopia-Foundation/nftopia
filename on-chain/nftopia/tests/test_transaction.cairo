use starknet::{ContractAddress, contract_address_const};
use core::array::ArrayTrait;

use snforge_std::{
    declare, ContractClassTrait, start_prank, stop_prank, 
    spy_events, SpyOn, EventSpy, EventAssertions
};

use nftopia::transaction::{
    ITransactionModuleDispatcher, ITransactionModuleDispatcherTrait,
    TransactionRecorded
};

// Helper function to deploy the contract
fn deploy_contract(name: ByteArray) -> ContractAddress {
    let contract = declare(name).unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@ArrayTrait::new()).unwrap();
    contract_address
}

// Test recording a transaction
#[test]
fn test_record_transaction() {
    // Deploy the contract
    let contract_address = deploy_contract("TransactionModule");
    let dispatcher = ITransactionModuleDispatcher { contract_address };
    
    // Create test data
    let token_id: u256 = 1;
    let amount: u256 = 1000;
    let user = contract_address_const::<0x123>();
    
    // Start event spy
    let mut spy = spy_events(SpyOn::One(contract_address));
    
    // Simulate call from user
    start_prank(contract_address, user);
    dispatcher.record_transaction(token_id, amount);
    stop_prank(contract_address);
    
    // Verify token is marked as sold
    let is_sold = dispatcher.is_token_sold(token_id);
    assert(is_sold == true, 'Token should be marked as sold');
    
    // Verify token price is recorded correctly
    let recorded_amount = dispatcher.get_token_price(token_id);
    assert(recorded_amount == amount, 'Token price should match');
    
    // Verify purchase is recorded in user's history
    let purchases = dispatcher.get_user_purchases(user);
    assert(purchases.len() == 1, 'User should have 1 purchase');
    assert(*purchases.at(0) == token_id, 'Purchase should match token_id');
    
    // Verify event emission
    spy.assert_emitted(@[
        (
            contract_address,
            TransactionRecorded { 
                buyer: user, 
                token_id: token_id, 
                amount: amount 
            }
        )
    ]);
}

// Test multiple consecutive transactions
#[test]
fn test_multiple_transactions() {
    // Deploy the contract
    let contract_address = deploy_contract("TransactionModule");
    let dispatcher = ITransactionModuleDispatcher { contract_address };
    
    // Create test data for multiple tokens
    let user = contract_address_const::<0x123>();
    let token_ids: Array<u256> = array![1, 2, 3];
    let amounts: Array<u256> = array![1000, 2000, 3000];
    
    // Start event spy
    let mut spy = spy_events(SpyOn::One(contract_address));
    
    // Record multiple transactions
    start_prank(contract_address, user);
    dispatcher.record_transaction(*token_ids.at(0), *amounts.at(0));
    dispatcher.record_transaction(*token_ids.at(1), *amounts.at(1));
    dispatcher.record_transaction(*token_ids.at(2), *amounts.at(2));
    stop_prank(contract_address);
    
    // Verify all tokens are marked as sold
    assert(dispatcher.is_token_sold(*token_ids.at(0)) == true, 'Token 1 should be sold');
    assert(dispatcher.is_token_sold(*token_ids.at(1)) == true, 'Token 2 should be sold');
    assert(dispatcher.is_token_sold(*token_ids.at(2)) == true, 'Token 3 should be sold');
    
    // Verify all token prices are recorded correctly
    assert(dispatcher.get_token_price(*token_ids.at(0)) == *amounts.at(0), 'Token 1 price incorrect');
    assert(dispatcher.get_token_price(*token_ids.at(1)) == *amounts.at(1), 'Token 2 price incorrect');
    assert(dispatcher.get_token_price(*token_ids.at(2)) == *amounts.at(2), 'Token 3 price incorrect');
    
    // Verify user's purchase history contains all tokens
    let purchases = dispatcher.get_user_purchases(user);
    assert(purchases.len() == 3, 'User should have 3 purchases');
    assert(*purchases.at(0) == *token_ids.at(0), 'First purchase mismatch');
    assert(*purchases.at(1) == *token_ids.at(1), 'Second purchase mismatch');
    assert(*purchases.at(2) == *token_ids.at(2), 'Third purchase mismatch');
    
    // Verify all events were emitted
    spy.assert_event_emitted(
        TransactionRecorded { 
            buyer: user, 
            token_id: *token_ids.at(0), 
            amount: *amounts.at(0) 
        }
    );
    spy.assert_event_emitted(
        TransactionRecorded { 
            buyer: user, 
            token_id: *token_ids.at(1), 
            amount: *amounts.at(1) 
        }
    );
    spy.assert_event_emitted(
        TransactionRecorded { 
            buyer: user, 
            token_id: *token_ids.at(2), 
            amount: *amounts.at(2) 
        }
    );
}

// Test attempting to sell an already sold token
#[test]
#[should_panic(expected: ('Token already sold',))]
fn test_resell_token() {
    // Deploy the contract
    let contract_address = deploy_contract("TransactionModule");
    let dispatcher = ITransactionModuleDispatcher { contract_address };
    
    // Create test data
    let token_id: u256 = 1;
    let amount: u256 = 1000;
    let user = contract_address_const::<0x123>();
    
    // Record first transaction
    start_prank(contract_address, user);
    dispatcher.record_transaction(token_id, amount);
    
    // Attempt to sell the same token again (should fail)
    dispatcher.record_transaction(token_id, amount);
    stop_prank(contract_address);
}

// Test recording a transaction with zero amount
#[test]
#[should_panic(expected: ('Amount must be greater than 0',))]
fn test_zero_amount_transaction() {
    // Deploy the contract
    let contract_address = deploy_contract("TransactionModule");
    let dispatcher = ITransactionModuleDispatcher { contract_address };
    
    // Create test data with zero amount
    let token_id: u256 = 1;
    let amount: u256 = 0;
    let user = contract_address_const::<0x123>();
    
    // Attempt to record transaction with zero amount (should fail)
    start_prank(contract_address, user);
    dispatcher.record_transaction(token_id, amount);
    stop_prank(contract_address);
}
