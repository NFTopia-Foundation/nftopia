use starknet::ContractAddress;

const DEFAULT_ADMIN_ROLE: felt252 = selector!("DEFAULT_ADMIN_ROLE");
const MODERATOR_ROLE: felt252 = selector!("MODERATOR_ROLE");
const TREASURY_ROLE: felt252 = selector!("TREASURY_ROLE");
const UPGRADE_ROLE: felt252 = selector!("UPGRADE_ROLE");

#[starknet::interface]
pub trait IAccessControl<TContractState> {
    fn has_admin_role(ref self: TContractState, account: ContractAddress) -> bool;
    fn has_moderator_role(ref self: TContractState, account: ContractAddress) -> bool;
    fn has_treasury_role(ref self: TContractState, account: ContractAddress) -> bool;
    fn has_upgrade_role(ref self: TContractState, account: ContractAddress) -> bool;
    fn get_roles(self: @TContractState, account: ContractAddress) -> Array<felt252>;
}


#[starknet::component]  
pub component AccessControl {
    use super::*;
    use starknet::{ContractAddress, get_caller_address};
    
    #[storage]
    pub struct Storage {
        pub AccessControl_role_admin: Map<felt252, felt252>,
        pub AccessControl_role_member: Map<(felt252, ContractAddress), bool>,
    }

    #[event]
    #[derive(Drop, Debug, PartialEq, starknet::Event)]
    pub enum Event {
        RoleGranted: RoleGranted,
        RoleRevoked: RoleRevoked
    }

    /// Emitted when `account` is granted `role`.
    ///
    /// `sender` is the account that originated the contract call, an account with the admin role
    /// or the deployer address if `grant_role` is called from the constructor.
    #[derive(Drop, Debug, PartialEq, starknet::Event)]
    pub struct RoleGranted {
        pub role: felt252,
        pub account: ContractAddress,
        pub sender: ContractAddress,
    }

    /// Emitted when `role` is revoked for `account`.
    ///
    /// `sender` is the account that originated the contract call:
    ///   - If using `revoke_role`, it is the admin role bearer.
    ///   - If using `renounce_role`, it is the role bearer (i.e. `account`).
    #[derive(Drop, Debug, PartialEq, starknet::Event)]
    pub struct RoleRevoked {
        pub role: felt252,
        pub account: ContractAddress,
        pub sender: ContractAddress,
    }

    #[embeddable_as(AccessControlComponent)]
    impl AccessControlImpl of IAccessControl<ComponentState<TContractState>> {
        
    }


}