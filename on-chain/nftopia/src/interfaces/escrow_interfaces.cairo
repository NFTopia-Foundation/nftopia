use starknet::contract_address::ContractAddress;

// SRC-721 Interface for NFT interactions
#[starknet::interface]
trait ISRC721<TContractState> {
    fn transfer_from(
        ref self: TContractState,
        from: ContractAddress,
        to: ContractAddress,
        token_id: u256,
    );
    fn approve(
        ref self: TContractState,
        to: ContractAddress,
        token_id: u256,
    );
    fn get_approved(self: @TContractState, token_id: u256) -> ContractAddress;
    fn is_approved_for_all(
        self: @TContractState,
        owner: ContractAddress,
        operator: ContractAddress,
    ) -> bool;
    fn owner_of(self: @TContractState, token_id: u256) -> ContractAddress;
}

// SRC-20 Interface for STRK token interactions
#[starknet::interface]
trait ISRC20<TContractState> {
    fn transfer(
        ref self: TContractState,
        recipient: ContractAddress,
        amount: u256,
    ) -> bool;
    fn transfer_from(
        ref self: TContractState,
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: u256,
    ) -> bool;
    fn approve(
        ref self: TContractState,
        spender: ContractAddress,
        amount: u256,
    ) -> bool;
    fn allowance(
        self: @TContractState,
        owner: ContractAddress,
        spender: ContractAddress,
    ) -> u256;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
}

// Escrow Interface for external interactions
#[starknet::interface]
trait IEscrow<TContractState> {
    fn create_swap(
        ref self: TContractState,
        nft_contract: ContractAddress,
        nft_id: u256,
        price: u256,
        expiry: u64,
    ) -> u256;
    fn accept_swap(ref self: TContractState, swap_id: u256);
    fn cancel_swap(ref self: TContractState, swap_id: u256);
    fn dispute_swap(ref self: TContractState, swap_id: u256);
    fn resolve_dispute(
        ref self: TContractState,
        swap_id: u256,
        winner: ContractAddress,
    );
    fn get_swap(self: @TContractState, swap_id: u256) -> (ContractAddress, ContractAddress, u256, u256, u64, u8, u64, Option<u64>, Option<u64>, Option<u64>, Option<u64>, Option<ContractAddress>);
    fn get_user_swaps(
        self: @TContractState,
        user: ContractAddress,
    ) -> Array<u256>;
    fn get_active_swaps(self: @TContractState) -> Array<u256>;
} 