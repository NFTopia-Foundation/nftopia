use soroban_sdk::Env;

pub fn now(env: &Env) -> u64 {
    env.ledger().timestamp()
}
