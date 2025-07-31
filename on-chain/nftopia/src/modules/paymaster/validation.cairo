#[starknet::contract]
mod PaymasterValidation {

    use starknet::ContractAddress;
    use array::ArrayTrait;
    use ecdsa::check_ecdsa_signature;

    #[storage]
    struct Storage {
    
    }

    fn _validate_signature(
        self: @ContractState,
        user: ContractAddress,
        hash: felt252,
        signature: Array<felt252>
    ) {
        // Using secp256r1 for AA wallet compatibility
        let is_valid = check_ecdsa_signature(
            hash,
            signature,
            user
        );
        assert(is_valid, 'INVALID_SIG');
    }
    
    fn _get_transaction_hash(
        self: @ContractState,
        user: ContractAddress,
        token: ContractAddress,
        amount: u256
    ) -> felt252 {
        // Domain-separated hash
        let domain = 'Starknet Paymaster v1';
        pedersen::pedersen(
            pedersen::pedersen(
                pedersen::pedersen(
                    domain,
                    user.into()
                ),
                token.into()
            ),
            amount.into()
        )
    }
}