#[starknet::contract]
mod PaymasterContract {
    use starknet::ContractAddress;
    use crate::modules::paymaster::interfaces::{ ISRC20Dispatcher };
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, Map};
    use crate::events::paymaster_events::PaymasterEvents::{ TransactionSponsored, RateUpdated };
    use core::pedersen;
    use core::ecdsa; 



 
    #[storage]
    pub struct Storage {
         admin: Map<ContractAddress, u256>,
         token_rates: Map<ContractAddress, u256>,
         collected_fees: Map<ContractAddress, u256>,
         is_paused: bool,
         rate_update_delay: u64
     }

     #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress) {
        self.admin.write(admin);
        self.rate_update_delay.write(86400); // 24 Hours
    }

     #[event]
     #[derive(Drop, starknet::Event)]
     pub enum Event {
        TransactionSponsored: TransactionSponsored,
        RateUpdated: RateUpdated
     }
    
    #[external(v0)]
    fn sponsor_transaction(
        ref self: ContractState,
        user: ContractAddress,
        token: ContractAddress,
        token_amount: u256,
        user_signature: Array<felt252>
    ) {
        // 1. Verify contract not paused
        assert(!self.is_paused.read(), 'PAUSED');
        
        // 2. Validate token is whitelisted
        let rate = self.token_rates.read(token);
        assert(rate != 0, 'INVALID_TOKEN');
        
        // 3. Verify user signature
        let hash = self._get_transaction_hash(user, token, token_amount);
        self._validate_signature(user, hash, user_signature);
        
        // 4. Calculate required token amount
        let gas_cost = self._estimate_gas_cost();
        let required_tokens = gas_cost / rate;
        assert(token_amount >= required_tokens, 'INSUFFICIENT_TOKENS');
        
        // 5. Transfer tokens from user
        let token_contract = ISRC20Dispatcher { contract_address: token };
        token_contract.transferFrom(user, self.contract_address, token_amount);
        
        // 6. Update balances
        self.collected_fees.write(token, self.collected_fees.read(token) + token_amount);
        
        // 7. Emit event
        self.emit(Event::TransactionSponsored{ user, token, token_amount });
    }
    
    #[external(v0)]
    fn set_token_exchange_rate(
        ref self: ContractState,
        token: ContractAddress,
        rate: u256
    ) {
        self._only_admin();
        assert(rate > 0, 'INVALID_RATE');
        self.token_rates.write(token, rate);
        self.emit(Event::RateUpdated{token, rate});
    }

    
#[generate_trait]
impl InternalImpl of InternalTrait {
    fn _validate_signature(
        self: @ContractState,
        user: ContractAddress,
        hash: felt252,
        signature: Array<felt252>
    ) {
        let is_valid = ecdsa::check_ecdsa_signature(
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

}