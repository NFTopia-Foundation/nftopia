#[starknet::interface]
pub trait GasEstimatorInterface<TContractState> {
    fn estimate_auction_bid(
        ref self: TContractState,
        nft_id: felt252,
        bid_amount: u128
    ) -> (u128, u128);

    fn estimate_batch_purchase(
        ref self: TContractState,
        token_ids: Span<felt252>,
        prices: Span<u128>
    ) -> (u128, u128);

    fn estimate_royalty_payment(
        ref self: TContractState,
        token_id: felt252,
        sale_price: u128
    ) -> (u128, u128);
}


#[starknet::component]
mod GasEstimatorComponent {
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use core::array::ArrayTrait;
    use core::traits::Into;
    use core::pedersen;
    use starknet::storage::{ StoragePointerWriteAccess, Map, StorageMapReadAccess, StorageMapWriteAccess };


    #[storage]
    pub struct Storage {
        last_estimations: Map<felt252, (u128, u128)>,
        estimation_cache: Map<felt252, (u128, u128)>,
        rate_limit: Map<ContractAddress, u64>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        EstimationPerformed: EstimationPerformed
    }

    #[derive(Drop, Serde, starknet::Event)]
    struct EstimationPerformed {
        estimate_type: felt252,
        base_gas: u128,
        l1_gas: u128
    }

    #[embeddable_as(GasEstimator)]
    impl GasEstimatorImpl<
        TContractState, +HasComponent<TContractState>
    > of super::GasEstimatorInterface<ComponentState<TContractState>> {
        fn estimate_auction_bid(
            ref self: ComponentState<TContractState>,
            nft_id: felt252,
            bid_amount: u128
        ) -> (u128, u128) {
            let caller = get_caller_address();
            self._check_rate_limit(caller);
            
            let cache_key = InternalImpl::_generate_cache_key(
                'auction_bid', 
                nft_id, 
                bid_amount.into()
            );

            match self.estimation_cache.read(cache_key) {
                Option::Some(value) => value,
                Option::None => {
                    let (base_gas, l1_gas) = InternalImpl::_simulate_auction_bid(bid_amount);
                    let estimate = self._apply_buffers(base_gas, l1_gas);
                    self.estimation_cache.write(cache_key, estimate);
                    self.emit(EstimationPerformed {
                        estimate_type: 'auction_bid',
                        base_gas: estimate.0,
                        l1_gas: estimate.1
                    });
                    estimate
                }
            }
        }

        fn estimate_batch_purchase(
            ref self: ComponentState<TContractState>,
            token_ids: Span<felt252>,
            prices: Span<u128>
        ) -> (u128, u128) {
            let caller = get_caller_address();
            self._check_rate_limit(caller);
    
            // Create combined hash of all token IDs and prices for cache key
            let mut combined_hash = 'batch_purchase';
            for i in 0..token_ids.len() {
                combined_hash = pedersen::pedersen(
                    combined_hash, 
                    pedersen::pedersen(
                        token_ids[i], 
                        prices[i].into()
                    )
                );
            };
    
            match self.estimation_cache.read(combined_hash) {
                Option::Some(value) => value,
                Option::None => {
                    let base_gas = 100000_u128 + (token_ids.len() as u128) * 20000_u128;
                    let l1_gas = 5000_u128;
                    let estimate = InternalImpl::_apply_buffers(base_gas, l1_gas);
                    
                    self.estimation_cache.write(combined_hash, estimate);
                    self.emit(EstimationPerformed {
                        estimate_type: 'batch_purchase',
                        base_gas: estimate.0,
                        l1_gas: estimate.1
                    });
                    estimate
                }
            }
        }
    
        fn estimate_royalty_payment(
            ref self: ComponentState<TContractState>,
            token_id: felt252,
            sale_price: u128
        ) -> (u128, u128) {
            let caller = get_caller_address();
            self._check_rate_limit(caller);
            
            let cache_key = self._generate_cache_key(
                'royalty_payment',
                token_id,
                sale_price.into()
            );
    
            let estimate = self.estimation_cache.read(cache_key);

            let (a, b) = estimate;
            (a, b)
        }
    }


    #[generate_trait]
    pub impl InternalImpl<TContractState, +HasComponent<TContractState>> of InternalTrait<TContractState> {
        fn _check_rate_limit(
            ref self: ComponentState<TContractState>,
            caller: ContractAddress
        ) {
            let current_timestamp = starknet::get_block_timestamp();
            let last_call = self.rate_limit.read(caller);
            
            assert(
                last_call + 60 < current_timestamp,
                'Rate limit exceeded'
            );
            
            self.rate_limit.write(caller, current_timestamp);
        }

        fn _generate_cache_key(
            ref self: ComponentState<TContractState>,
            prefix: felt252,
            param1: felt252,
            param2: felt252
        ) -> felt252 {
            let intermediate_hash = pedersen::pedersen(param1, param2);
            pedersen::pedersen(prefix, intermediate_hash)
        }

        fn _simulate_auction_bid(bid_amount: u128) -> (u128, u128) {
            (150000_u128 + bid_amount / 1000000, 7000_u128)
        }

        fn _estimate_royalty_gas(sale_price: u128) -> u128 {
            25000_u128 + sale_price / 100000
        }

        fn _apply_buffers(
            base_gas: u128,
            l1_gas: u128
        ) -> (u128, u128) {
            (base_gas * 120 / 100, l1_gas * 120 / 100)
        }
    }
}