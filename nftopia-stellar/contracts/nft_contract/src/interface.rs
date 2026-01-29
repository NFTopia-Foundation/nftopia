use soroban_sdk::{Env, Symbol};

pub fn supports_interface_id(env: &Env, interface_id: Symbol) -> bool {
    let nft = Symbol::new(env, "nft");
    let metadata = Symbol::new(env, "metadata");
    let royalty = Symbol::new(env, "royalty");
    let access = Symbol::new(env, "access_control");

    interface_id == nft || interface_id == metadata || interface_id == royalty || interface_id == access
}
