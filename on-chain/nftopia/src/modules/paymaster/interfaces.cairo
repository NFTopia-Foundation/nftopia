#[starknet::interface]
trait IPaymaster<TContractState> {
    fn sponsor_transaction(
        self: @TContractState,
        user: ContractAddress,
        token: ContractAddress,
        token_amount: u256,
        user_signature: Array<felt252>
    );
    
    fn set_token_exchange_rate(
        self: @TContractState,
        token: ContractAddress,
        rate: u256
    );
    
    fn withdraw_fees(
        self: @TContractState,
        token: ContractAddress,
        amount: u256
    );
}

#[starknet::interface]
trait ISRC20<TContractState> {
    fn transferFrom(
        self: @TContractState,
        from: ContractAddress,
        to: ContractAddress,
        amount: u256
    );
}