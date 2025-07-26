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

#[starknet::component]  
pub component AccessControl {
    use super::*;
    use starknet::storage::{Map, StoragePathEntry, StoragePointerWriteAccess, StoragePointerReadAccess};
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    
    #[storage]
    pub struct Storage {
        pub role_member: Map<(felt252, ContractAddress), bool>,
        pub role_admin: Map<felt252, felt252>,
        pub role_admin_count: u64, 
        pub role_member_count: Map<felt252, u64>,
        pub role_expiry: Map<felt252, u64>,
        // number of approvals required to receive admin role
        pub role_admin_approval_threshold: u64,
        // proposal_id -> proposal
        pub role_admin_proposals: Map<u64, AdminRoleProposal>,
        // proposal_id -> approval count
        pub role_admin_approval_count: Map<u64, u64>,
        // (proposal_id, admin) -> has approved
        pub has_approved_admin_role_proposal: Map<(u64, ContractAddress), bool>,
        // proposal_id -> timestamp of last admin approval
        pub last_admin_approval_timestamp: Map<u64, u64>,
    }

    #[event]
    #[derive(Drop, Debug, PartialEq, starknet::Event)]
    pub enum Event {
        RoleGranted: RoleGranted,
        RoleRevoked: RoleRevoked,
        AdminRoleProposalApproved: AdminRoleProposalApproved,
        AdminRoleApprovalThresholdUpdated: AdminRoleApprovalThresholdUpdated,
        AdminRoleProposalExecuted: AdminRoleProposalExecuted,
        AdminRoleProposalCreated: AdminRoleProposalCreated,
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

    #[derive(Drop, Debug, PartialEq, starknet::Event)]
    pub struct AdminRoleProposalCreated {
        pub proposal_id: u64,
        pub caller: ContractAddress,
    }

    #[derive(Drop, Debug, PartialEq, starknet::Event)]
    pub struct AdminRoleProposalApproved {
        pub proposal_id: u64,
        pub caller: ContractAddress,
    }
    #[derive(Drop, Debug, PartialEq, starknet::Event)]
    pub struct AdminRoleApprovalThresholdUpdated {
        pub threshold: u64,
        pub admin: ContractAddress,
    }
    #[derive(Drop, Debug, PartialEq, starknet::Event)]
    pub struct AdminRoleProposalExecuted {
        pub proposal_id: u64,
        pub caller: ContractAddress,
    }
    #[derive(Drop, Serde, starknet::Store)]
    pub struct AdminRoleProposal {
        pub account: ContractAddress,
        pub action: u8, // 1 = grant, 2 = revoke
        pub proposer: ContractAddress,
        pub executed: bool,
    }
    
    #[embeddable_as(AccessControlComponent)]
    impl AccessControlImpl of IAccessControl<ComponentState<TContractState>> {
        fn has_role(ref self: ComponentState<TContractState>, role: felt252, account: ContractAddress) -> bool {
            self.role_member.entry((role, account)).read()
        }

        fn has_admin_role(ref self: ComponentState<TContractState>, account: ContractAddress) -> bool {
            self.role_member.entry((DEFAULT_ADMIN_ROLE, account)).read()
        }

        fn has_moderator_role(ref self: ComponentState<TContractState>, account: ContractAddress) -> bool {
            self.role_member.entry((MODERATOR_ROLE, account)).read()
        }

        fn has_treasury_role(ref self: ComponentState<TContractState>, account: ContractAddress) -> bool {
            self.role_member.entry((TREASURY_ROLE, account)).read()
        }

        fn has_upgrade_role(ref self: ComponentState<TContractState>, account: ContractAddress) -> bool {
            self.role_member.entry((UPGRADE_ROLE, account)).read()
        }

        fn get_roles_members_count(self: @ComponentState<TContractState>, role: felt252) -> u64 {
            self.role_member_count.entry(role).read()
        }

        fn get_roles(self: @ComponentState<TContractState>, account: ContractAddress) -> Array<felt252> {
            let mut roles: Array<felt252> = array![];

            if self.has_admin_role(account) {
                roles.push(DEFAULT_ADMIN_ROLE);
            }

            if self.has_moderator_role(account) {
                roles.push(MODERATOR_ROLE);
            }

            if self.has_treasury_role(account) {
                roles.push(TREASURY_ROLE);
            }

            if self.has_upgrade_role(account) {
                roles.push(UPGRADE_ROLE);
            }

            return roles;
        }

        /// Grant a role to an account
        /// @param role The role to grant
        /// @param account The account to grant the role to
        /// @param expiry The expiry time for the role
        ///
        /// This function will grant a role to an account.

        fn grant_role(self: @ComponentState<TContractState>, role: felt252, account: ContractAddress, expiry: u64) {
            let caller = get_caller_address();
            self.assert_only_admin();
            if role == DEFAULT_ADMIN_ROLE {
                self._create_admin_proposal(GRANT_ROLE_ACTION, account);
            }else{
                self._grant_role(role, account, expiry);
            }
        }

        fn grant_roles(self: @ComponentState<TContractState>, roles: Array<felt252>, account: ContractAddress, expiry: u64) {
            self.assert_only_admin();
            for index in 0..roles.len() {
                self._grant_role(*roles[index], account, expiry);
            }
        }

        fn revoke_role(self: @ComponentState<TContractState>, role: felt252, account: ContractAddress) {
            let caller = get_caller_address();
            self.assert_only_admin();
            self._revoke_role(role, account);
        }

        fn revoke_roles(self: @ComponentState<TContractState>, roles: Array<felt252>, account: ContractAddress) {
            self.assert_only_admin();
            for index in 0..roles.len() {
                self._revoke_role(*roles[index], account);
            }
        }

        fn renounce_role(self: @ComponentState<TContractState>, role: felt252) {
            let caller = get_caller_address();
            self._revoke_role(role, caller);
        }
    }
}