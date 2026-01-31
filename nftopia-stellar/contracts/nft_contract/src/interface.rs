use soroban_sdk::{BytesN, Env};

pub fn nft_received_magic(env: &Env) -> BytesN<32> {
    BytesN::from_array(
        env,
        &[
            0x4e, 0x46, 0x54, 0x4f, 0x50, 0x49, 0x41, 0x5f, 0x4e, 0x46, 0x54, 0x5f,
            0x52, 0x45, 0x43, 0x45, 0x49, 0x56, 0x45, 0x44, 0x5f, 0x4d, 0x41, 0x47,
            0x49, 0x43, 0x5f, 0x5f, 0x5f, 0x5f, 0x5f, 0x5f,
        ],
    )
}

pub fn interface_id(env: &Env, name: &str) -> BytesN<32> {
    let bytes = soroban_sdk::Bytes::from_slice(env, name.as_bytes());
    env.crypto().sha256(&bytes).into()
}

pub fn nft_interface_id(env: &Env) -> BytesN<32> {
    interface_id(env, "nftopia.nft.v1")
}

pub fn royalty_interface_id(env: &Env) -> BytesN<32> {
    interface_id(env, "nftopia.royalty.v1")
}

pub fn metadata_interface_id(env: &Env) -> BytesN<32> {
    interface_id(env, "nftopia.metadata.v1")
}

pub fn access_control_interface_id(env: &Env) -> BytesN<32> {
    interface_id(env, "nftopia.access.v1")
}
