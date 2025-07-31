#[cfg(test)]
mod tests {
    use crate::GasEstimator;
    use starknet::contract_address_constants;
    
    #[test]
    fn test_auction_bid_estimation() {
        let contract = test_utils::deploy_contract();
        let (wei_est, strk_est) = contract.estimate_auction_bid(123, 1000000);
        
        assert(wei_est > 0, 'Should return positive wei estimate');
        assert(strk_est > 0, 'Should return positive strk estimate');
    }
    
    #[test]
    fn test_rate_limiting() {
        let contract = test_utils::deploy_contract();
        let _ = contract.estimate_auction_bid(123, 1000000);
        
        // Second call in same "block" should fail
        let result = contract.try_estimate_auction_bid(123, 1000000);
        assert(result.is_err(), 'Should fail on rate limit');
    }
}