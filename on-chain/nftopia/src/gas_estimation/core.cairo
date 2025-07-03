#[feature("deprecated_legacy_map")]
#[starknet::contract]
mod GasEstimator {
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use crate::gas_estimation::interfaces::GasEstimatorInterface;
    
    #[storage]
    struct Storage {
        last_estimations: LegacyMap<felt252, (u128, u128)>,
        estimation_cache: LegacyMap<felt252, (u128, u128)>,
        rate_limit: LegacyMap<ContractAddress, u64>,
    }

    #[constructor]
    fn constructor(ref self: ContractState) {
        // No additional initialization needed
    }

    #[abi(embed_v0)]
    impl GasEstimatorImpl of GasEstimatorInterface<ContractState> {
        fn estimate_auction_bid(
            self: @ContractState,
            nft_id: felt252,
            bid_amount: u128
        ) -> (u128, u128) {
            let caller = get_caller_address();
            InternalImpl::_check_rate_limit(self, caller);
            let cache_key = InternalImpl::_generate_cache_key(self, 'auction_bid', nft_id, bid_amount);

            match self.estimation_cache.read(cache_key) {
                Option::Some(value) => value,
                Option::None => {
                    let (base_gas, l1_gas) = InternalImpl::_simulate_auction_bid(self, nft_id, bid_amount);
                    let estimate = InternalImpl::_apply_buffers(self, base_gas, l1_gas);
                    self.estimation_cache.write(cache_key, estimate);
                    estimate
                },
            }
        }

        fn estimate_batch_purchase(
            self: @ContractState,
            token_ids: Span<felt252>,
            prices: Span<u128>
        ) -> (u128, u128) {
            let caller = get_caller_address();
            InternalImpl::_check_rate_limit(self, caller);
            let key = InternalImpl::_generate_cache_key(
                self, 
                'batch_purchase', 
                token_ids.len().into(), 
                prices.len().into()
            );

            match self.estimation_cache.read(key) {
                Option::Some(value) => value,
                Option::None => {
                    let base_gas = 100000_u128 + (token_ids.len() as u128) * 20000_u128;
                    let l1_gas = 5000_u128;
                    let estimate = InternalImpl::_apply_buffers(self, base_gas, l1_gas);
                    self.estimation_cache.write(key, estimate);
                    estimate
                },
            }
        }

        fn estimate_royalty_payment(
            self: @ContractState,
            token_id: felt252,
            sale_price: u128
        ) -> (u128, u128) {
            let caller = get_caller_address();
            InternalImpl::_check_rate_limit(self, caller);
            let key = InternalImpl::_generate_cache_key(self, 'royalty', token_id, sale_price);

            match self.estimation_cache.read(key) {
                Option::Some(value) => value,
                Option::None => {
                    let royalty_gas = InternalImpl::_estimate_royalty_gas(self, token_id, sale_price);
                    let estimate = InternalImpl::_apply_buffers(self, royalty_gas, 1000_u128);
                    self.estimation_cache.write(key, estimate);
                    estimate
                },
            }
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _check_rate_limit(self: @ContractState, caller: ContractAddress) {
            let current_timestamp = starknet::get_block_timestamp();
            let last_call = self.rate_limit.read(caller);
            
            if last_call.unwrap_or(0_u64) + 60 >= current_timestamp {
                panic(array!['rate_limit_exceeded']);
            }
            
            self.rate_limit.write(caller, current_timestamp);
        }

        fn _generate_cache_key(
            self: @ContractState,
            prefix: felt252,
            param1: felt252,
            param2: u128
        ) -> felt252 {
            // Simple hash implementation
            let mut key = prefix;
            key = key + param1;
            key = key + param2.into();
            key
        }

        fn _simulate_auction_bid(
            self: @ContractState,
            nft_id: felt252,
            bid_amount: u128
        ) -> (u128, u128) {
            // Simulation logic
            let base_gas = 150000_u128 + (bid_amount / 1000000);
            let l1_gas = 7000_u128;
            (base_gas, l1_gas)
        }

        fn _estimate_royalty_gas(
            self: @ContractState,
            token_id: felt252,
            sale_price: u128
        ) -> u128 {
            // Royalty estimation logic
            25000_u128 + (sale_price / 100000)
        }

        fn _apply_buffers(
            self: @ContractState,
            base_gas: u128,
            l1_gas: u128
        ) -> (u128, u128) {
            // Apply 20% buffer
            let buffered_base = base_gas * 120 / 100;
            let buffered_l1 = l1_gas * 120 / 100;
            (buffered_base, buffered_l1)
        }
    }
}
