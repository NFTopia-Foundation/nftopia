#![cfg(test)]
extern crate std;

use soroban_sdk::{Env, String, Vec};
use soroban_sdk::testutils::{Address as _, Ledger, LedgerInfo};

use crate::{NftContract, NftContractClient};
use crate::token::{TokenAttribute, RoyaltyInfo};

fn setup_env() -> Env {
    let env = Env::default();
    env.ledger().set(LedgerInfo {
        timestamp: 1,
        ..Default::default()
    });
    env.mock_all_auths();
    env
}

#[test]
fn mint_and_transfer_flow() {
    let env = setup_env();
    let owner = soroban_sdk::Address::generate(&env);
    let alice = soroban_sdk::Address::generate(&env);
    let bob = soroban_sdk::Address::generate(&env);

    let contract_id = env.register_contract(None, NftContract);
    let client = NftContractClient::new(&env, &contract_id);

    client.init(
        &owner,
        &String::from_str(&env, "NFTopia"),
        &String::from_str(&env, "NFT"),
        &String::from_str(&env, "ipfs://base"),
        &None,
        &None,
        &owner,
        &500,
    );

    let mut attrs = Vec::new(&env);
    attrs.push_back(TokenAttribute {
        trait_type: String::from_str(&env, "color"),
        value: String::from_str(&env, "red"),
        display_type: None,
    });

    let token_id = client.mint(
        &alice,
        &String::from_str(&env, "ipfs://token/1"),
        &attrs,
        &None,
    );

    assert_eq!(client.owner_of(&token_id), alice);
    assert_eq!(client.balance_of(&alice), 1);

    client.approve(&bob, &token_id);
    client.transfer(&alice, &bob, &token_id);

    assert_eq!(client.owner_of(&token_id), bob);
    assert_eq!(client.balance_of(&alice), 0);
    assert_eq!(client.balance_of(&bob), 1);
}

#[test]
fn royalty_calculation() {
    let env = setup_env();
    let owner = soroban_sdk::Address::generate(&env);
    let alice = soroban_sdk::Address::generate(&env);

    let contract_id = env.register_contract(None, NftContract);
    let client = NftContractClient::new(&env, &contract_id);

    client.init(
        &owner,
        &String::from_str(&env, "NFTopia"),
        &String::from_str(&env, "NFT"),
        &String::from_str(&env, ""),
        &None,
        &None,
        &owner,
        &1000,
    );

    let attrs = Vec::new(&env);
    let royalty_override = RoyaltyInfo {
        recipient: owner.clone(),
        percentage: 750,
    };

    let token_id = client.mint(
        &alice,
        &String::from_str(&env, "ipfs://token/2"),
        &attrs,
        &Some(royalty_override),
    );

    let (recipient, amount) = client.get_royalty_info(&token_id, &10_000i128);
    assert_eq!(recipient, owner);
    assert_eq!(amount, 750);
}
