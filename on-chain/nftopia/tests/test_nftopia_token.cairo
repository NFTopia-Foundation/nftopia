use starknet::contract_address_const;
use snforge_std::{
    declare, DeclareResultTrait, ContractClassTrait, start_cheat_caller_address, stop_cheat_caller_address
};
use core::serde::Serde;
use core::byte_array::ByteArray;

use nftopia::contracts::nftopia_token::{INftopiaTokenDispatcher, INftopiaTokenDispatcherTrait};

// Test constants
const ADMIN: felt252 = 'admin';
const USER1: felt252 = 'user1';
const USER2: felt252 = 'user2';
const USER3: felt252 = 'user3';

fn deploy_token() -> INftopiaTokenDispatcher {
    let admin_address = contract_address_const::<ADMIN>();
    
    let initial_supply = 1000000000000000000000000_u256; // 1M tokens with 18 decimals

    let token_class = declare("NftopiaToken").unwrap().contract_class();
    let name: ByteArray = "NFTopia Token";
    let symbol: ByteArray = "NFTO";
    let mut calldata = array![];
    Serde::serialize(@name, ref calldata);
    Serde::serialize(@symbol, ref calldata);
    Serde::serialize(@initial_supply, ref calldata);
    Serde::serialize(@admin_address, ref calldata);

    let (token_address, _) = token_class.deploy(@calldata).unwrap();
    
    INftopiaTokenDispatcher { contract_address: token_address }
}

#[test]
fn test_token_deployment() {
    let token = deploy_token();
    let admin_address = contract_address_const::<ADMIN>();
    
    let expected_name: ByteArray = "NFTopia Token";
    let expected_symbol: ByteArray = "NFTO";
    assert(token.name() == expected_name, 'Wrong name');
    assert(token.symbol() == expected_symbol, 'Wrong symbol');
    assert(token.decimals() == 18, 'Wrong decimals');
    assert(token.total_supply() == 1000000000000000000000000, 'Wrong total supply');
    assert(token.balance_of(admin_address) == 1000000000000000000000000, 'Wrong initial balance');
}

#[test]
fn test_transfer() {
    let token = deploy_token();
    let admin_address = contract_address_const::<ADMIN>();
    let user1_address = contract_address_const::<USER1>();
    
    let transfer_amount = 1000000000000000000000_u256; // 1000 tokens
    
    start_cheat_caller_address(token.contract_address, admin_address);
    let success = token.transfer(user1_address, transfer_amount);
    stop_cheat_caller_address(token.contract_address);
    
    assert(success, 'Transfer failed');
    assert(token.balance_of(user1_address) == transfer_amount, 'Wrong recipient balance');
    assert(token.balance_of(admin_address) == 999000000000000000000000, 'Wrong sender balance');
}

#[test]
fn test_approve_and_transfer_from() {
    let token = deploy_token();
    let admin_address = contract_address_const::<ADMIN>();
    let user1_address = contract_address_const::<USER1>();
    let user2_address = contract_address_const::<USER2>();
    
    let approve_amount = 1000000000000000000000_u256; // 1000 tokens
    let transfer_amount = 500000000000000000000_u256; // 500 tokens
    
    // Admin approves user1 to spend tokens
    start_cheat_caller_address(token.contract_address, admin_address);
    let success = token.approve(user1_address, approve_amount);
    stop_cheat_caller_address(token.contract_address);
    
    assert(success, 'Approve failed');
    assert(token.allowance(admin_address, user1_address) == approve_amount, 'Wrong allowance');
    
    // User1 transfers from admin to user2
    start_cheat_caller_address(token.contract_address, user1_address);
    let success = token.transfer_from(admin_address, user2_address, transfer_amount);
    stop_cheat_caller_address(token.contract_address);
    
    assert(success, 'Transfer from failed');
    assert(token.balance_of(user2_address) == transfer_amount, 'Wrong recipient balance');
    assert(token.balance_of(admin_address) == 999500000000000000000000, 'Wrong sender balance');
    assert(token.allowance(admin_address, user1_address) == 500000000000000000000, 'Wrong remaining allowance');
}

#[test]
fn test_mint() {
    let token = deploy_token();
    let admin_address = contract_address_const::<ADMIN>();
    let user1_address = contract_address_const::<USER1>();
    
    let mint_amount = 1000000000000000000000_u256; // 1000 tokens
    let initial_supply = 1000000000000000000000000_u256;
    
    start_cheat_caller_address(token.contract_address, admin_address);
    token.mint(user1_address, mint_amount);
    stop_cheat_caller_address(token.contract_address);
    
    assert(token.balance_of(user1_address) == mint_amount, 'Wrong minted balance');
    assert(token.total_supply() == initial_supply + mint_amount, 'Wrong total supply after mint');
}

#[test]
fn test_burn() {
    let token = deploy_token();
    let admin_address = contract_address_const::<ADMIN>();
    
    let burn_amount = 1000000000000000000000_u256; // 1000 tokens
    let initial_supply = 1000000000000000000000000_u256;
    
    start_cheat_caller_address(token.contract_address, admin_address);
    token.burn(admin_address, burn_amount);
    stop_cheat_caller_address(token.contract_address);
    
    assert(token.balance_of(admin_address) == initial_supply - burn_amount, 'Wrong balance after burn');
    assert(token.total_supply() == initial_supply - burn_amount, 'Wrong total supply after burn');
}

#[test]
fn test_voting_power() {
    let token = deploy_token();
    let admin_address = contract_address_const::<ADMIN>();
    let user1_address = contract_address_const::<USER1>();
    
    let transfer_amount = 1000000000000000000000_u256; // 1000 tokens
    
    // Transfer tokens to user1
    start_cheat_caller_address(token.contract_address, admin_address);
    token.transfer(user1_address, transfer_amount);
    stop_cheat_caller_address(token.contract_address);
    
    // Check voting power (simplified: equals balance)
    assert(token.get_votes(user1_address) == transfer_amount, 'Wrong voting power');
    assert(token.get_past_votes(user1_address, 0) == transfer_amount, 'Wrong past voting power');
    assert(token.get_past_total_supply(0) == 1000000000000000000000000, 'Wrong past total supply');
}

#[test]
#[should_panic(expected: ('Only owner can mint',))]
fn test_mint_unauthorized() {
    let token = deploy_token();
    let user1_address = contract_address_const::<USER1>();
    
    let mint_amount = 1000000000000000000000_u256; // 1000 tokens
    
    start_cheat_caller_address(token.contract_address, user1_address);
    token.mint(user1_address, mint_amount);
    stop_cheat_caller_address(token.contract_address);
}

#[test]
#[should_panic(expected: ('Only owner can burn',))]
fn test_burn_unauthorized() {
    let token = deploy_token();
    let user1_address = contract_address_const::<USER1>();
    
    let burn_amount = 1000000000000000000000_u256; // 1000 tokens
    
    start_cheat_caller_address(token.contract_address, user1_address);
    token.burn(user1_address, burn_amount);
    stop_cheat_caller_address(token.contract_address);
}

#[test]
#[should_panic(expected: ('Insufficient balance',))]
fn test_transfer_insufficient_balance() {
    let token = deploy_token();
    let user1_address = contract_address_const::<USER1>();
    let user2_address = contract_address_const::<USER2>();
    
    let transfer_amount = 1000000000000000000000_u256; // 1000 tokens
    
    start_cheat_caller_address(token.contract_address, user1_address);
    token.transfer(user2_address, transfer_amount);
    stop_cheat_caller_address(token.contract_address);
}

#[test]
#[should_panic(expected: ('Insufficient allowance',))]
fn test_transfer_from_insufficient_allowance() {
    let token = deploy_token();
    let admin_address = contract_address_const::<ADMIN>();
    let user1_address = contract_address_const::<USER1>();
    let user2_address = contract_address_const::<USER2>();
    
    let transfer_amount = 1000000000000000000000_u256; // 1000 tokens
    
    start_cheat_caller_address(token.contract_address, user1_address);
    token.transfer_from(admin_address, user2_address, transfer_amount);
    stop_cheat_caller_address(token.contract_address);
}