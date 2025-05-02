#[starknet::contract]
mod INFI {
    use starknet::{ContractAddress, get_caller_address};
    use core::array::ArrayTrait;

    #[storage]
    struct Storage {
        name: felt252,
        symbol: felt252,
        owner: ContractAddress,
        token_counter: u256,
        token_uri: LegacyMap<u256, felt252>,
        balances: LegacyMap<ContractAddress, u256>,
        token_approvals: LegacyMap<u256, ContractAddress>,
        operator_approvals: LegacyMap<(ContractAddress, ContractAddress), bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    struct Transfer {
        from: ContractAddress,
        to: ContractAddress,
        token_id: u256,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        name: felt252,
        symbol: felt252,
        owner: ContractAddress
    ) {
        self.name.write(name);
        self.symbol.write(symbol);
        self.owner.write(owner);
        self.token_counter.write(0);
    }

    #[external(v0)]
    impl INFIImpl of super::IINFI<ContractState> {
        fn initialize(
            ref self: ContractState,
            name: felt252,
            symbol: felt252,
            owner: ContractAddress
        ) {
            // This function is now handled by the constructor
            panic_with_felt252('Use constructor instead');
        }
    }

    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn _mint(ref self: ContractState, to: ContractAddress, token_uri: felt252) -> u256 {
            assert(!to.is_zero(), 'Cannot mint to zero address');
            
            let token_id = self.token_counter.read() + 1;
            self.token_counter.write(token_id);
            self.token_uri.write(token_id, token_uri);
            
            let balance = self.balances.read(to);
            self.balances.write(to, balance + 1);
            
            self.emit(Transfer { from: contract_address_const::<0>(), to, token_id });
            
            token_id
        }
    }
}