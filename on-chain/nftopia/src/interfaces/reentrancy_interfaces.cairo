use starknet::ContractAddress;

#[starknet::interface]
pub trait INotifyReentrancy<TContractState> {
    fn on_reentrancy_attempt(ref self: TContractState, caller: ContractAddress, timestamp: u64);
}


#[starknet::interface]
pub trait IReentrancyGuardTrait<TContractState> {
    /// Checks if the contract is currently locked
    fn assert_non_reentrant(self: @TContractState);
    
    /// Locks the contract to prevent reentrancy
    fn lock(ref self: TContractState);
    
    /// Unlocks the contract after operation completes
    fn unlock(ref self: TContractState);
}

