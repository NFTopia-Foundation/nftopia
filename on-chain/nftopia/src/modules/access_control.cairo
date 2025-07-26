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

        fn approve_admin_role_proposal(self: @ComponentState<TContractState>, proposal_id: u64) {
            self.assert_only_admin();
            let proposal = self.role_admin_proposals.entry(proposal_id).read();
            assert(!proposal.executed, 'proposal already executed');
            let caller = get_caller_address();
            let has_approved = self.has_approved_admin_role_proposal.entry((proposal_id, caller)).read();
            assert(!has_approved, 'caller already approved proposal');
            self.has_approved_admin_role_proposal.entry((proposal_id, caller)).write(true);
            self.last_admin_approval_timestamp.entry(proposal_id).write(get_block_timestamp());
            self.emit(AdminRoleProposalApproved { proposal_id, caller });
        }

        /// Execute the admin role proposal
        /// @param account The account to execute the admin role for
        ///
        /// This function will grant the admin role to the account if the proposal is approved 
        /// and the timelock has passed.
        ///
        /// This function will reset the proposal count and last approval timestamp.
        ///
        /// This function will revert if the proposal is not approved or the timelock has not passed.
        fn execute_admin_role_proposal(self: @ComponentState<TContractState>, proposal_id: u64) {
            self.assert_only_admin();
            let mut proposal = self.role_admin_proposals.entry(proposal_id).read();
            assert(!proposal.executed, 'proposal already executed');
            let proposal_count = self.role_admin_approval_count.entry(proposal_id).read();
            let approval_threshold = self.role_admin_approval_threshold.read();
            let last_approval_timestamp = self.last_admin_approval_timestamp.entry(proposal_id).read();
            let current_timestamp = get_block_timestamp();
            let is_approved = proposal_count >= approval_threshold;
            let has_passed_timelock = last_approval_timestamp + ADMIN_ROLE_TIMELOCK < current_timestamp;
            assert(is_approved, 'admin role proposal is not approved');
            assert(has_passed_timelock, 'admin role proposal has not passed timelock');
            if proposal.action == GRANT_ROLE_ACTION {
                self._grant_role(DEFAULT_ADMIN_ROLE, proposal.account, 0);
            }else{
                self._revoke_role(DEFAULT_ADMIN_ROLE, proposal.account);
            }
            proposal.executed = true;
            self.role_admin_proposals.entry(proposal_id).write(proposal);
            self.emit(AdminRoleProposalExecuted { proposal_id, caller: get_caller_address() });
        }

        /// Update the admin role approval threshold
        /// @param threshold The new threshold for the admin role approval
        ///
        /// This function will update the admin role approval threshold.
        ///
        /// This function will revert if the caller is not the admin.
        fn update_admin_role_approval_threshold(self: @ComponentState<TContractState>, threshold: u64) {
            self.assert_only_admin();
            assert(threshold > 0, 'threshold must be greater than 0');
            let role_admin_count = self.role_admin_count.read();
            assert(threshold <= role_admin_count, 'threshold is too high');
            self.role_admin_approval_threshold.write(threshold);    
            self.emit(AdminRoleApprovalThresholdUpdated { threshold , admin: get_caller_address() });
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

    #[generate_trait]
    impl InternalImpl of InternalTrait<ComponentState<TContractState>> {
        fn initializer(ref self: ComponentState<TContractState>, approval_threshold: u64) {
            self.role_admin_approval_threshold.write(approval_threshold);
        }
        fn _create_admin_proposal(ref self: ComponentState<TContractState>, action: u8, account: ContractAddress) {
            self.assert_only_admin();
            let caller = get_caller_address();
            let proposal_id = self.proposals_count.read();
            let new_proposal_id = proposal_id + 1;
            let new_proposal = AdminRoleProposal {
                account,
                action,
                proposer: caller,
                last_approval_timestamp: get_block_timestamp(),
                executed: false,
            };
            self.role_admin_proposals.entry(new_proposal_id).write(new_proposal);
            self.role_admin_approval_count.entry(new_proposal_id).write(1);
            self.has_approved_admin_role_proposal.entry((new_proposal_id, caller)).write(true);
            self.emit(AdminRoleProposalCreated { proposal_id: new_proposal_id, caller });
        }
        fn _grant_role(ref self: ComponentState<TContractState>, role: felt252, account: ContractAddress, expiry: u64) {
            if !self.has_role(role, account) {
                self.role_member.entry((role, account)).write(true);
                self.role_member_count.entry(role).write(self.get_roles_members_count(role) + 1);
                if expiry > 0 {
                    self.role_expiry.entry(role).write(get_block_timestamp() + expiry);
                }
                if role == DEFAULT_ADMIN_ROLE {
                    self.role_admin_count.write(self.role_admin_count.read() + 1);
                }
                self.emit(RoleGranted { role, account, sender: get_caller_address() });
            }
        }

        fn _revoke_role(ref self: ComponentState<TContractState>, role: felt252, account: ContractAddress) {
            if self.has_role(role, account) {
                self.role_member.entry((role, account)).write(false);
                self.role_member_count.entry(role).write(self.get_roles_members_count(role) - 1);
                self.role_expiry.entry(role).write(0);
                if role == DEFAULT_ADMIN_ROLE {
                    self.role_admin_count.write(self.role_admin_count.read() - 1);
                }
                self.emit(RoleRevoked { role, account, sender: get_caller_address() });
            }
        }
        fn assert_only_role(self: @ComponentState<TContractState>, role: felt252) {
            let caller = get_caller_address();
            assert(self.has_role(role, caller), 'caller does not have role');
        }
        fn assert_only_admin(self: @ComponentState<TContractState>) {
            let caller = get_caller_address();
            assert(self.has_admin_role(caller), 'caller does not have admin role');
        }
        fn assert_only_upgrade(self: @ComponentState<TContractState>) {
            let caller = get_caller_address();
            assert(self.has_upgrade_role(caller), 'caller does not have upgrade role');
        }
        fn assert_only_moderator(self: @ComponentState<TContractState>) {
            let caller = get_caller_address();
            assert(self.has_moderator_role(caller), 'caller does not have moderator role');
        }
        fn assert_only_treasury(self: @ComponentState<TContractState>) {
            let caller = get_caller_address();
            assert(self.has_treasury_role(caller), 'caller does not have treasury role');
        }
    }
}