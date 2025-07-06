use starknet::ContractAddress;

#[starknet::interface]
trait IRoyaltyStandard<TContractState> {
    fn royalty_info(
        self: @TContractState,
        token_id: u256,
        sale_price: u256
    ) -> (ContractAddress, u256);
    
    fn set_default_royalty(
        self: @TContractState,
        receiver: ContractAddress,
        fee_basis_points: u16
    );
    
    fn set_token_royalty(
        self: @TContractState,
        token_id: u256,
        receiver: ContractAddress,
        fee_basis_points: u16
    );
}

