#[cfg(test)]
mod tests {
    use super::RoyaltyContract;
    use starknet::ContractAddress;
    use integer::u256_from_felt252;

    #[test]
    fn test_default_royalty() {
        let mut contract = RoyaltyContract::test_fixture();
        let price = u256_from_felt252(1000);
        let (receiver, amount) = contract.royalty_info(1, price);
        assert(receiver == DEFAULT_RECEIVER, 'Wrong receiver');
        assert(amount == 25, 'Wrong amount'); // 2.5% of 1000
    }

    #[test]
    fn test_token_override() {
        let mut contract = RoyaltyContract::test_fixture();
        contract.set_token_royalty(1, OVERRIDE_RECEIVER, 1000); // 10%
        let (receiver, amount) = contract.royalty_info(1, u256_from_felt252(1000));
        assert(receiver == OVERRIDE_RECEIVER, 'Override failed');
        assert(amount == 100, 'Wrong override amount');
    }
}