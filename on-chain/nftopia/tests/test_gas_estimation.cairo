#[starknet::contract]
pub mod MockGasEstimator {
    use nftopia::gas_estimation::gas_estimator_component::GasEstimatorComponent;

    component!(path: GasEstimatorComponent, storage: gas_estimator, event: GasEstimatorEvent);

    pub impl GasEstimatorComponentImpl = GasEstimatorComponent::GasEstimator<ContractState>;
    pub impl GasEstimatorComponentInternalImpl = GasEstimatorComponent::InternalImpl<ContractState>;


    #[storage]
    struct Storage {
        #[substorage(v0)]
        gas_estimator: GasEstimatorComponent::Storage
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        GasEstimatorEvent: GasEstimatorComponent::Event
    }

    #[abi(embed_v0)]
    pub impl MockGasEstimatorImpl of super::IMockGasEstimator<ContractState> {
        fn estimate_auction_bid(
            ref self: ContractState,
            nft_id: felt252,
            bid_amount: u128
        ) -> (u128, u128) {
            self.gas_estimator.estimate_auction_bid(nft_id, bid_amount)
        }

        fn estimate_batch_purchase(
            ref self: ContractState,
            token_ids: Span<felt252>,
            prices: Span<u128>
        ) -> (u128, u128) {
            self.gas_estimator.estimate_batch_purchase(token_ids, prices)
        }

        fn estimate_royalty_payment(
            ref self: ContractState,
            token_id: felt252,
            sale_price: u128
        ) -> (u128, u128) {
            self.gas_estimator.estimate_royalty_payment(token_id, sale_price)
        }
    }
}

#[starknet::interface]
trait IMockGasEstimator<TContractState> {
    fn estimate_auction_bid(ref self: TContractState, nft_id: felt252, bid_amount: u128) -> (u128, u128);
    fn estimate_batch_purchase(ref self: TContractState, token_ids: Span<felt252>, prices: Span<u128>) -> (u128, u128);
    fn estimate_royalty_payment(ref self: TContractState, token_id: felt252, sale_price: u128) -> (u128, u128);
}


#[cfg(test)]
mod tests {
    use super::IMockGasEstimatorDispatcher;
    use super::IMockGasEstimatorDispatcherTrait;
    use starknet::ContractAddress;
    use core::array::ArrayTrait;
    use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};

    const TEST_NFT_ID: felt252 = 123;
    const TEST_TOKEN_ID: felt252 = 456;
    const TEST_BID_AMOUNT: u128 = 1000;
    const TEST_SALE_PRICE: u128 = 5000;

    fn deploy_mock_contract() -> ContractAddress {
        let contract = declare("MockGasEstimator").unwrap().contract_class();
        let (contract_address, _) = contract.deploy(@ArrayTrait::new()).unwrap();
        contract_address
    }

    #[test]
    fn test_auction_bid_estimation() {
        let contract_address = deploy_mock_contract();
        let dispatcher = IMockGasEstimatorDispatcher { contract_address };

        // First populate the cache (in a real scenario this would be done via internal calls)
        let token_ids = array![TEST_NFT_ID];
        let prices = array![TEST_BID_AMOUNT];
        dispatcher.estimate_batch_purchase(token_ids.span(), prices.span());

        let (base_gas, l1_gas) = dispatcher.estimate_auction_bid(TEST_NFT_ID, TEST_BID_AMOUNT);
        assert!(base_gas > 0, "Base gas should be positive");
        assert!(l1_gas > 0, "L1 gas should be positive");
    }

    #[test]
    fn test_batch_purchase_estimation() {
        let contract_address = deploy_mock_contract();
        let dispatcher = IMockGasEstimatorDispatcher { contract_address };

        let token_ids = array![111.into(), 222.into(), 333.into()];
        let prices = array![1000_u128, 2000_u128, 3000_u128];

        let (base_gas, l1_gas) = dispatcher.estimate_batch_purchase(
            token_ids.span(),
            prices.span()
        );

        assert!(base_gas > 0, "Batch base gas should be positive");
        assert!(l1_gas > 0, "Batch L1 gas should be positive");
    }

    #[test]
    fn test_royalty_estimation() {
        let contract_address = deploy_mock_contract();
        let dispatcher = IMockGasEstimatorDispatcher { contract_address };

        let (base_gas, l1_gas) = dispatcher.estimate_royalty_payment(
            TEST_TOKEN_ID,
            TEST_SALE_PRICE
        );

        assert!(base_gas > 0, "Royalty base gas should be positive");
        assert!(l1_gas > 0, "Royalty L1 gas should be positive");
    }

    #[test]
    #[should_panic]
    fn test_rate_limiting() {
        let contract_address = deploy_mock_contract();
        let dispatcher = IMockGasEstimatorDispatcher { contract_address };

        // First call should succeed
        dispatcher.estimate_auction_bid(TEST_NFT_ID, TEST_BID_AMOUNT);
        
        // Second immediate call should panic
        dispatcher.estimate_auction_bid(TEST_NFT_ID, TEST_BID_AMOUNT);
    }
}