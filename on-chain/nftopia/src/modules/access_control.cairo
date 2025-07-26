use starknet::ContractAddress;

const DEFAULT_ADMIN_ROLE: felt252 = selector!("DEFAULT_ADMIN_ROLE");
const MODERATOR_ROLE: felt252 = selector!("MODERATOR_ROLE");
const TREASURY_ROLE: felt252 = selector!("TREASURY_ROLE");
const UPGRADE_ROLE: felt252 = selector!("UPGRADE_ROLE");
const ADMIN_ROLE_TIMELOCK: u64 = 86400;
const GRANT_ROLE_ACTION: u8 = 1;
const REVOKE_ROLE_ACTION: u8 = 2;

#[starknet::interface]
pub trait IAccessControl<TContractState> {
    fn has_role(ref self: TContractState, role: felt252, account: ContractAddress) -> bool;
    fn has_admin_role(ref self: TContractState, account: ContractAddress) -> bool;
    fn has_moderator_role(ref self: TContractState, account: ContractAddress) -> bool;
    fn has_treasury_role(ref self: TContractState, account: ContractAddress) -> bool;
    fn has_upgrade_role(ref self: TContractState, account: ContractAddress) -> bool;
    fn get_roles(self: @TContractState, account: ContractAddress) -> Array<felt252>;
    fn get_roles_members_count(self: @TContractState, role: felt252) -> u64;
    fn grant_role(self: @TContractState, role: felt252, account: ContractAddress, expiry: u64);
    fn update_admin_role_approval_threshold(self: @TContractState, threshold: u64);
    fn approve_admin_role_proposal(self: @TContractState, proposal_id: u64);
    fn execute_admin_role_proposal(self: @TContractState, proposal_id: u64);
    fn grant_roles(self: @TContractState, roles: Array<felt252>, account: ContractAddress, expiry: u64);
    fn revoke_role(self: @TContractState, role: felt252, account: ContractAddress);
    fn revoke_roles(self: @TContractState, roles: Array<felt252>, account: ContractAddress);
    fn renounce_role(self: @TContractState, role: felt252);
}