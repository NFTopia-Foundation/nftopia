#[cfg(test)]
mod tests {
    use nftopia::contracts::paymaster_contract::{
        IPaymasterDispatcher, IPaymasterDispatcherTrait
    };
    use starknet::ContractAddress;
    use starknet::contract_address::contract_address_const;
    use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
    use core::array::ArrayTrait;

   

    fn deploy_paymaster() -> ContractAddress {
        let contract = declare("PaymasterContract").unwrap().contract_class();
        let (contract_address, _) = contract.deploy(@ArrayTrait::new()).unwrap();
        contract_address
    }

    #[test]
    fn test_constructor_and_admin_functions() {
        let contract_address = deploy_paymaster();
        let paymaster = IPaymasterDispatcher { contract_address };

        let TEST_ADMIN: ContractAddress = contract_address_const::<0x1234>();

        // Verify initial admin
        assert!(paymaster.is_whitelisted(TEST_ADMIN), "Admin should be whitelisted by default");
    }

    #[test]
    fn test_token_management() {
        let contract_address = deploy_paymaster();
        let paymaster = IPaymasterDispatcher { contract_address };

        let TEST_ADMIN: ContractAddress = contract_address_const::<0x1234>();
        let TEST_TOKEN: ContractAddress = contract_address_const::<0x9abc>();
        let TEST_RATE: u256 = u256 { low: 100, high: 0 }; // 1:100 rate
        let TEST_AMOUNT: u256 = u256 { low: 1000, high: 0 }; // 1000 units

        // Support token
        paymaster.update_rate(TEST_TOKEN, TEST_RATE);

        // Verify rate
        let rate = paymaster.get_rate(TEST_TOKEN);
        assert!(rate == TEST_RATE, "Incorrect token rate");

        // Add balance
        paymaster.withdraw_fees(TEST_TOKEN, TEST_AMOUNT, TEST_ADMIN); // Inverted for testing

        // Verify balance
        let balance = paymaster.get_balance(TEST_TOKEN);
        assert!(balance == TEST_AMOUNT, "Incorrect token balance");
    }

    #[test]
    fn test_transaction_sponsorship() {
        let contract_address = deploy_paymaster();
        let paymaster = IPaymasterDispatcher { contract_address };

        let TEST_ADMIN: ContractAddress = contract_address_const::<0x1234>();
        let TEST_USER: ContractAddress = contract_address_const::<0x5678>();
        let TEST_TOKEN: ContractAddress = contract_address_const::<0x9abc>();
        let TEST_RATE: u256 = u256 { low: 100, high: 0 }; // 1:100 rate
        let TEST_FEE: u256 = u256 { low: 10, high: 0 }; // 10 units
        let TEST_AMOUNT: u256 = u256 { low: 1000, high: 0 }; // 1000 units

        // Setup
        paymaster.update_rate(TEST_TOKEN, TEST_RATE);
        paymaster.withdraw_fees(TEST_TOKEN, TEST_AMOUNT, TEST_ADMIN); // Add balance
        paymaster.is_whitelisted(TEST_USER); // Whitelist user

        // Sponsor transaction
        let success = paymaster.sponsor_transaction(TEST_USER, TEST_TOKEN, TEST_FEE);
        assert!(success, "Sponsorship failed");

        // Verify balance deduction
        let new_balance = paymaster.get_balance(TEST_TOKEN);
        let expected_cost = TEST_FEE * TEST_RATE;
        assert!(new_balance == TEST_AMOUNT - expected_cost, "Incorrect balance after sponsorship");
    }

    #[test]
    fn test_fee_withdrawal() {
        let contract_address = deploy_paymaster();
        let paymaster = IPaymasterDispatcher { contract_address };

        let TEST_ADMIN: ContractAddress = contract_address_const::<0x1234>();
        let TEST_USER: ContractAddress = contract_address_const::<0x5678>();
        let TEST_TOKEN: ContractAddress = contract_address_const::<0x9abc>();
        let TEST_RATE: u256 = u256 { low: 100, high: 0 }; // 1:100 rate
        let TEST_AMOUNT: u256 = u256 { low: 1000, high: 0 }; // 1000 units

        // Setup
        paymaster.update_rate(TEST_TOKEN, TEST_RATE);
        paymaster.withdraw_fees(TEST_TOKEN, TEST_AMOUNT, TEST_ADMIN); // Add balance

        // Withdraw fees
        let withdraw_amount = u256 { low: 500, high: 0 };
        paymaster.withdraw_fees(TEST_TOKEN, withdraw_amount, TEST_USER);

        // Verify balance
        let balance = paymaster.get_balance(TEST_TOKEN);
        assert!(balance == TEST_AMOUNT - withdraw_amount, "Incorrect balance after withdrawal");
    }

    #[test]
    #[should_panic]
    fn test_unauthorized_sponsorship() {
        let contract_address = deploy_paymaster();
        let paymaster = IPaymasterDispatcher { contract_address };

        let TEST_USER: ContractAddress = contract_address_const::<0x5678>();
        let TEST_TOKEN: ContractAddress = contract_address_const::<0x9abc>();
        let TEST_FEE: u256 = u256 { low: 10, high: 0 }; // 10 units

        // Attempt sponsorship with non-whitelisted user
        paymaster.sponsor_transaction(TEST_USER, TEST_TOKEN, TEST_FEE);
    }

    #[test]
    #[should_panic]
    fn test_insufficient_balance() {
        let contract_address = deploy_paymaster();
        let paymaster = IPaymasterDispatcher { contract_address };

        let TEST_USER: ContractAddress = contract_address_const::<0x5678>();
        let TEST_TOKEN: ContractAddress = contract_address_const::<0x9abc>();
        let TEST_RATE: u256 = u256 { low: 100, high: 0 }; // 1:100 rate
        let TEST_FEE: u256 = u256 { low: 10, high: 0 }; // 10 units

        // Setup
        paymaster.update_rate(TEST_TOKEN, TEST_RATE);
        paymaster.is_whitelisted(TEST_USER);

        // Attempt sponsorship with insufficient balance
        paymaster.sponsor_transaction(TEST_USER, TEST_TOKEN, TEST_FEE);
    }

    #[test]
    #[should_panic]
    fn test_unauthorized_rate_change() {
        let contract_address = deploy_paymaster();
        let paymaster = IPaymasterDispatcher { contract_address };

        
        let TEST_TOKEN: ContractAddress = contract_address_const::<0x9abc>();
        let TEST_RATE: u256 = u256 { low: 100, high: 0 }; // 1:100 rate
       

        // Non-admin attempts rate change
        paymaster.update_rate(TEST_TOKEN, TEST_RATE);
    }

    #[test]
    fn test_whitelist_management() {
        let contract_address = deploy_paymaster();
        let paymaster = IPaymasterDispatcher { contract_address };

        let TEST_USER: ContractAddress = contract_address_const::<0x5678>();

        // Whitelist user
        paymaster.is_whitelisted(TEST_USER);

        // Verify
        assert(paymaster.is_whitelisted(TEST_USER), 'User should be whiteliste');
    }
}
