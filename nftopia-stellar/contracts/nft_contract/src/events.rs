use soroban_sdk::{symbol_short, Address, Env, String};

use crate::token::RoyaltyInfo;

pub fn emit_mint(env: &Env, to: &Address, token_id: u64) {
    env.events()
        .publish((symbol_short!("mint"), to), token_id);
}

pub fn emit_burn(env: &Env, owner: &Address, token_id: u64) {
    env.events()
        .publish((symbol_short!("burn"), owner), token_id);
}

pub fn emit_transfer(env: &Env, from: &Address, to: &Address, token_id: u64) {
    env.events()
        .publish((symbol_short!("transfer"), from, to), token_id);
}

pub fn emit_approval(env: &Env, owner: &Address, approved: &Option<Address>, token_id: u64) {
    env.events().publish(
        (symbol_short!("approve"), owner),
        (approved.clone(), token_id),
    );
}

pub fn emit_approval_for_all(env: &Env, owner: &Address, operator: &Address, approved: bool) {
    env.events().publish(
        (symbol_short!("appr_all"), owner),
        (operator, approved),
    );
}

pub fn emit_metadata_update(env: &Env, token_id: u64, uri: &String) {
    env.events()
        .publish((symbol_short!("metadata"), token_id), uri.clone());
}

pub fn emit_base_uri_update(env: &Env, uri: &String) {
    env.events()
        .publish((symbol_short!("base_uri"),), uri.clone());
}

pub fn emit_royalty_update(env: &Env, token_id: Option<u64>, info: &RoyaltyInfo) {
    env.events()
        .publish((symbol_short!("royalty"), token_id), info.clone());
}
