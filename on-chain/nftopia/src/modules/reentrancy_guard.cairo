use starknet::ContractAddress;

#[starknet::interface]
pub trait IReentrancyGuard<TContractState> {
    fn assert_non_reentrant(ref self: TContractState, notifier: Option<ContractAddress>);
    fn lock(ref self: TContractState);
    fn unlock(ref self: TContractState);
}

#[derive(Drop, Serde, starknet::Event)]
pub struct ReentrancyAttempt {
    pub caller: ContractAddress,
    pub timestamp: u64,
}

#[derive(Drop, Serde, starknet::Event)]
pub struct ReentrancyDetected {
    pub caller: ContractAddress,
    pub timestamp: u64
}

#[derive(Drop, Serde, starknet::Event)]
pub struct CallerBlacklisted {
    pub malicious_caller: ContractAddress,
    pub by: ContractAddress
}

#[starknet::component]
pub mod ReentrancyGuardComponent {
    use starknet::storage::StoragePointerReadAccess;
use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::get_block_timestamp;
    use super::{IReentrancyGuard, ReentrancyAttempt, ReentrancyDetected, CallerBlacklisted};
    use starknet::storage::{ StoragePointerWriteAccess, Map, StorageMapReadAccess, StorageMapWriteAccess };



   
    #[storage]
    pub struct Storage {
        locked: bool,
        last_attempt: (ContractAddress, u64),
        attempt_counts: Map<ContractAddress, u64>,
        blacklist: Map<ContractAddress, bool>
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        ReentrancyAttempt: ReentrancyAttempt,
        ReentrancyDetected: ReentrancyDetected,
        CallerBlacklisted: CallerBlacklisted,
    }

  

    #[embeddable_as(ReentrancyGuard)]
    pub impl ReentrancyGuardComponentImpl<TContractState, +HasComponent<TContractState>> of IReentrancyGuard<ComponentState<TContractState>> {
        #[inline(always)]
        fn assert_non_reentrant(
            ref self: ComponentState<TContractState>,
            notifier: Option<ContractAddress>
        ) {
            if self.locked.read() {
                let timestamp = get_block_timestamp();
                // Optional external notification
                match notifier {
                    Option::Some(address) => {
                        self._on_reentrancy_attempt(address, timestamp);
                    },
                    Option::None => (),
                }
                
                panic!("ReentrancyGuard: reentrant call");
            }
        }

        #[inline(always)]
        fn lock(ref self: ComponentState<TContractState>) {
            self.locked.write(true);
        }

        #[inline(always)]
        fn unlock(ref self: ComponentState<TContractState>) {
            self.locked.write(false);
        }
    }

    #[generate_trait]
    pub impl InternalImpl<TContractState, +HasComponent<TContractState>> of InternalTrait<TContractState> {
        
        fn _on_reentrancy_attempt(
            ref self: ComponentState<TContractState>, 
            caller: ContractAddress, 
            timestamp: u64
        ) {
            // 1. Record attempt
            self.last_attempt.write((caller, timestamp));
            let count = self.attempt_counts.read(caller) + 1;
            self.attempt_counts.write(caller, count);
    
            // 2. Auto-blacklist after 3 attempts
            if count >= 3 {
                self.blacklist.write(caller, true);
                self.emit(CallerBlacklisted {
                    malicious_caller: caller,
                    by: get_caller_address()
                });
            }
    
            // 3. Emit detection event
            self.emit(ReentrancyDetected { caller, timestamp });
        }
    }
    
}