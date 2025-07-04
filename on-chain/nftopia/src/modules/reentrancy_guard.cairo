#[starknet::contract]
pub mod ReentrancyGuard {
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::get_block_timestamp;
    use crate::interfaces::reentrancy_interfaces::INotifyReentrancy;
    use crate::interfaces::reentrancy_interfaces::IReentrancyGuardTrait;

    #[storage]
    pub struct Storage {
        locked: bool,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        ReentrancyAttempt: ReentrancyAttempt,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ReentrancyAttempt {
        pub caller: ContractAddress,
        pub timestamp: u64,
    }

    #[generate_trait]
    pub impl ReentrancyGuardImpl of IReentrancyGuardTrait<TContractState> {
        #[inline(always)]
        fn assert_non_reentrant(ref self: ContractState, notifier: Option<ContractAddress>) {
            if self.locked.read() {
                let caller = get_caller_address();
                let timestamp = get_block_timestamp();
                
                // Emit event
                self.emit(Event::ReentrancyAttempt(ReentrancyAttempt {
                    caller,
                    timestamp
                }));
                
                // Optional external notification
                match notifier {
                    Option::Some(address) => {
                        let dispatcher = INotifyReentrancyDispatcher { contract_address: address };
                        dispatcher.on_reentrancy_attempt(caller, timestamp);
                    },
                    Option::None => (),
                }
                
                panic_with_felt252('ReentrancyGuard: reentrant call');
            }
        }

        #[inline(always)]
        fn lock(ref self: ContractState) {
            self.locked.write(true);
        }

        #[inline(always)]
        fn unlock(ref self: ContractState) {
            self.locked.write(false);
        }
    }
}
