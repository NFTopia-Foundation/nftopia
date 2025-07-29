use starknet::ContractAddress;


#[event]
fn DefaultRoyaltyUpdated(
    receiver: ContractAddress,
    fee_basis_points: u16
) {}

#[event]
fn TokenRoyaltyUpdated(
    token_id: u256,
    receiver: ContractAddress,
    fee_basis_points: u16
) {}