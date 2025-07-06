#[starknet::contract]
mod Paymaster {

    use starknet::ContractAddress;  
    use crate::interfaces::IPaymaster;
    use crate::modules::paymaster::logic::PaymasterLogic;
    use crate::storage::paymaster_storage::PaymasterStorage;
    use crate::modules::paymaster::validation::PaymasterValidation;

    #[storage]
    struct Storage {

    }
 
    
    #[constructor]
    fn constructor(ref self: ContractState, admin: ContractAddress) {
        self._set_admin(admin);
        self.rate_update_delay.write(86400);  // 24h cooldown
    }
    
    impl PaymasterLogicImpl = PaymasterLogic::PaymasterLogicImpl<ContractState>;
    impl PaymasterStorageImpl = PaymasterStorage::PaymasterStorageImpl<ContractState>;
    impl PaymasterValidationImpl = PaymasterValidation::PaymasterValidationImpl<ContractState>;
}