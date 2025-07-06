#[cfg(test)]
mod tests {
    use super::PaymasterContract;
    use starknet::ContractAddress;
    
    #[test]
    fn test_sponsor_transaction() {
        let mut paymaster = PaymasterContract::test_fixture();
        let user = test_address(1);
        let token = test_address(2);
        
        // Setup token
        paymaster.set_token_exchange_rate(token, 1000); // 1 token = 1000 wei
        
        // Test sponsorship
        paymaster.sponsor_transaction(
            user,
            token,
            5000,  // 5 tokens
            valid_signature(user)
        );
        
        assert(paymaster.collected_fees(token) == 5000, 'Fees not collected');
    }
}