use soroban_sdk::{Address, Env, String, Symbol};

use crate::access_control::Role;

pub fn emit_transfer(env: &Env, from: Address, to: Address, token_id: u64) {
    env.events()
        .publish((Symbol::new(env, "transfer"),), (from, to, token_id));
}

pub fn emit_mint(env: &Env, to: Address, token_id: u64) {
    env.events()
        .publish((Symbol::new(env, "mint"),), (to, token_id));
}

pub fn emit_burn(env: &Env, owner: Address, token_id: u64) {
    env.events()
        .publish((Symbol::new(env, "burn"),), (owner, token_id));
}

pub fn emit_approval(env: &Env, approved: Address, token_id: u64) {
    env.events()
        .publish((Symbol::new(env, "approval"),), (approved, token_id));
}

pub fn emit_approval_for_all(env: &Env, owner: Address, operator: Address, approved: bool) {
    env.events()
        .publish((Symbol::new(env, "approval_for_all"),), (owner, operator, approved));
}

pub fn emit_metadata_update(env: &Env, token_id: u64) {
    env.events()
        .publish((Symbol::new(env, "metadata_update"),), token_id);
}

pub fn emit_base_uri_update(env: &Env, uri: String) {
    env.events()
        .publish((Symbol::new(env, "base_uri_update"),), uri);
}

pub fn emit_pause(env: &Env, paused: bool) {
    env.events().publish((Symbol::new(env, "pause"),), paused);
}

pub fn emit_role_grant(env: &Env, role: Role, to: Address) {
    env.events()
        .publish((Symbol::new(env, "role_grant"),), (role, to));
}

pub fn emit_role_revoke(env: &Env, role: Role, from: Address) {
    env.events()
        .publish((Symbol::new(env, "role_revoke"),), (role, from));
}
