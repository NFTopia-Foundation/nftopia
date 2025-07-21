#[starknet::contract]
mod PaymasterLogic {
    use starknet::ContractAddress;
    use crate::interfaces::*{
        IPaymasterDispatcher,
        ISRC20Dispatcher,
    };
    use crate::storage::paymaster_storage::Storage;

 
    
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
        PaymasterEvents::emit_transaction_sponsored(user, token, token_amount);
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
        PaymasterEvents::emit_rate_updated(token, rate);
    }
}