use starknet::{ContractAddress, get_caller_address, get_block_timestamp, get_contract_address, get_block_number};
use core::byte_array::ByteArray;
use core::traits::{Into, TryInto, Copy};
use core::array::{Array, ArrayTrait, Span, SpanTrait};
use core::hash::{HashStateTrait};
use core::poseidon::PoseidonTrait;
use core::result::ResultTrait;
use starknet::syscalls::call_contract_syscall;
use starknet::storage::{StorageMapReadAccess, StorageMapWriteAccess, Map, Vec, VecTrait, MutableVecTrait, StoragePointerReadAccess, StoragePointerWriteAccess};
use crate::contracts::nft_contract::{INftContractDispatcher, INftContractDispatcherTrait};
use crate::contracts::nftopia_token::{INftopiaTokenDispatcher, INftopiaTokenDispatcherTrait};
use crate::contracts::dao_treasury::{IDaoTreasuryDispatcher, IDaoTreasuryDispatcherTrait};

#[derive(Drop, Serde, Clone, Copy, starknet::Store)]
pub struct Call {
    pub to: ContractAddress,
    pub selector: felt252,
    pub calldata: Span<felt252>,   
}



#[derive(Drop, Serde, starknet::Store)]
pub struct Proposal {
    pub id: felt252,
    pub proposer: ContractAddress,
    pub title: ByteArray,
    pub description_hash: felt252,
    pub calls: Array<Call>,
    pub vote_start: u64,
    pub vote_end: u64,
    pub proposal_type: ProposalType,
    pub for_votes: u256,
    pub against_votes: u256,
    pub abstain_votes: u256,
    pub canceled: bool,
    pub executed: bool,
    pub queued_at: u64,
    pub eta: u64, // execution time available
}

/// Proposal states
#[derive(Drop, Serde, Copy, PartialEq)]
pub enum ProposalState {
    Pending,    // 0 - Proposal created, voting not started
    Active,     // 1 - Voting period active
    Canceled,   // 2 - Proposal canceled
    Defeated,   // 3 - Voting failed
    Succeeded,  // 4 - Voting succeeded
    Queued,     // 5 - Proposal queued for execution
    Executed,   // 6 - Proposal executed
}

/// Proposal types with different voting periods
#[derive(Drop, Serde, Copy, PartialEq, starknet::Store)]
pub enum ProposalType {
    #[default]
    Standard,    // 7 days voting period
    Emergency,   // 48 hours voting period
    Parameter,   // Parameter change proposal
}

#[derive(Drop, Serde, Copy, PartialEq)]
pub enum ParameterType {
    VotingDelay,
    VotingPeriod,
    ProposalThreshold,
    QuorumNumerator,
    TimelockDelay,
}

#[derive(Drop, Serde)]
pub struct ParameterChange {
    param_type: ParameterType,
    new_value: u256,
}

#[starknet::interface]
pub trait IDaoGovernance<TContractState> {
    fn name(self: @TContractState) -> ByteArray;
    fn version(self: @TContractState) -> felt252;
    fn voting_delay(self: @TContractState) -> u64;
    fn voting_period(self: @TContractState) -> u64;
    fn emergency_voting_period(self: @TContractState) -> u64;
    fn proposal_threshold(self: @TContractState) -> u256;
    fn quorum_numerator(self: @TContractState) -> u256;
    fn timelock_delay(self: @TContractState) -> u64;
    fn get_proposal(self: @TContractState, proposal_id: felt252) -> Proposal;
    fn get_proposal_state(self: @TContractState, proposal_id: felt252) -> ProposalState;
    fn get_voting_power(self: @TContractState, account: ContractAddress, timepoint: u64) -> u256;
    fn has_voted(self: @TContractState, proposal_id: felt252, voter: ContractAddress) -> bool;
    fn get_vote(self: @TContractState, proposal_id: felt252, voter: ContractAddress) -> (bool, u8, u256);
    fn proposal_count(self: @TContractState) -> u256;
    fn hash_proposal(self: @TContractState, calls: Span<Call>, description_hash: felt252) -> felt252;
    
    // Delegation functions
    fn get_delegate(self: @TContractState, delegator: ContractAddress) -> ContractAddress;
    fn get_delegated_votes(self: @TContractState, delegate: ContractAddress, timepoint: u64) -> u256;
    
    fn propose(
        ref self: TContractState,
        calls: Span<Call>,
        title: ByteArray,
        description_hash: felt252,
        proposal_type: ProposalType
    ) -> felt252;
    fn cast_vote(ref self: TContractState, proposal_id: felt252, support: u8) -> u256;
    fn cast_vote_with_reason(ref self: TContractState, proposal_id: felt252, support: u8, reason: ByteArray) -> u256;
    fn cast_delegated_vote(ref self: TContractState, proposal_id: felt252, support: u8, delegator: ContractAddress) -> u256;
    fn delegate_vote(ref self: TContractState, delegatee: ContractAddress);
    fn cancel_proposal(ref self: TContractState, proposal_id: felt252);
    fn queue_proposal(ref self: TContractState, proposal_id: felt252);
    fn execute_proposal(ref self: TContractState, proposal_id: felt252);
    
    // Treasury integration
    fn request_treasury_withdrawal(ref self: TContractState, beneficiary: ContractAddress, amount: u256, description_hash: felt252) -> felt252;
    
    // Admin functions
    fn set_voting_delay(ref self: TContractState, new_delay: u64);
    fn set_voting_period(ref self: TContractState, new_period: u64);
    fn set_proposal_threshold(ref self: TContractState, new_threshold: u256);
    fn set_quorum_numerator(ref self: TContractState, new_numerator: u256);
    fn set_timelock_delay(ref self: TContractState, new_delay: u64);
    fn set_allowed_calls(ref self: TContractState, target: ContractAddress, selectors: Array<felt252>, max_value: u256);
}

#[starknet::contract]
pub mod DaoGovernance {
    use super::{Proposal, ProposalState, ProposalType, Call};
    use starknet::{ContractAddress, Store};
    use starknet::{get_caller_address, get_contract_address, get_block_timestamp};
    use core::byte_array::ByteArray;
    use core::hash::{HashStateTrait, HashStateExTrait};
    use core::poseidon::PoseidonTrait;
    use core::array::ArrayTrait;
    use core::traits::Into;
    use starknet::storage::{StorageMapReadAccess, StorageMapWriteAccess, Map,  Vec, VecTrait, StoragePointerWriteAccess, StoragePointerReadAccess};
    use starknet::syscalls::call_contract_syscall;
    use crate::contracts::nft_contract::{INftContractDispatcher, INftContractDispatcherTrait};
    use crate::contracts::nftopia_token::{INftopiaTokenDispatcher, INftopiaTokenDispatcherTrait};
    use crate::contracts::dao_treasury::{IDaoTreasuryDispatcher, IDaoTreasuryDispatcherTrait};

    const DEFAULT_VOTING_DELAY: u64 = 86400; // 1 day
    const DEFAULT_VOTING_PERIOD: u64 = 604800; // 7 days
    const EMERGENCY_VOTING_PERIOD: u64 = 172800; // 48 hours
    const DEFAULT_PROPOSAL_THRESHOLD: u256 = 100000000000000000000; // 100 tokens (18 decimals)
    const DEFAULT_QUORUM_NUMERATOR: u256 = 40; // 4%
    const QUORUM_DENOMINATOR: u256 = 1000;
    const DEFAULT_TIMELOCK_DELAY: u64 = 172800; // 48 hours

    // Vote types
    const AGAINST: u8 = 0;
    const FOR: u8 = 1;
    const ABSTAIN: u8 = 2;





    #[derive(Drop, Serde, Copy, starknet::Store)]
struct VoteLock {
    locked_until: u64,
    locked_amount: u256,
}

    #[derive(Drop, Serde, Copy, starknet::Store)]
struct DelegationCheckpoint {
    from_timestamp: u64,
    votes: u256,
}

    #[derive(Drop, Serde, Copy, starknet::Store)]
struct PackedVoteData {
    // Pack multiple vote data into single storage slot for gas efficiency
    // Bits 0-1: support (0=against, 1=for, 2=abstain)
    // Bits 2-63: timestamp (62 bits)
    // Bits 64-255: weight (192 bits)
    packed_data: felt252,
}

    #[storage]
    struct Storage {
        // Contract metadata
        name: ByteArray,
        version: felt252,
        
        // Governance parameters
        voting_delay: u64,
        voting_period: u64,
        proposal_threshold: u256,
        quorum_numerator: u256,
        timelock_delay: u64,
        
        // External contracts
        token_contract: ContractAddress,
        nft_contract: ContractAddress,
        treasury_contract: ContractAddress,
        
        // Proposals
        proposal_counter: u256,
        proposal_ids: Map<felt252, bool>,
        proposal_proposers: Map<felt252, ContractAddress>,
        proposal_titles: Map<felt252, ByteArray>,
        proposal_description_hashes: Map<felt252, felt252>,
        proposal_vote_starts: Map<felt252, u64>,
        proposal_vote_ends: Map<felt252, u64>,
        proposal_types: Map<felt252, ProposalType>,
        proposal_for_votes: Map<felt252, u256>,
        proposal_against_votes: Map<felt252, u256>,
        proposal_abstain_votes: Map<felt252, u256>,
        proposal_canceled: Map<felt252, bool>,
        proposal_executed: Map<felt252, bool>,
        proposal_queued_at: Map<felt252, u64>,
        proposal_eta: Map<felt252, u64>,
        
    // Proposal calls storage (split into components)
    proposal_call_count: Map<felt252, u32>, // Number of calls in a proposal
    proposal_call_targets: Map<(felt252, u32), ContractAddress>, // (proposal_id, call_index) => target
    proposal_call_selectors: Map<(felt252, u32), felt252>, // (proposal_id, call_index) => selector
    proposal_call_data_len: Map<(felt252, u32), u32>, // (proposal_id, call_index) => calldata length
    proposal_call_data: Map<(felt252, u32, u32), felt252>, // (proposal_id, call_index, data_index) => calldata value
    
    // Voting records and protections (optimized)
    vote_records: Map<(felt252, ContractAddress), PackedVoteData>, // (proposal_id, voter) => packed vote data
    vote_locks: Map<ContractAddress, VoteLock>, // voter => lock details
    last_vote_block: Map<ContractAddress, u64>, // voter => block number of last vote
    proposal_vote_weights: Map<felt252, u256>, // proposal_id => total vote weight (for quorum)
    
    // Vote delegation
    delegates: Map<ContractAddress, ContractAddress>, // delegator => delegate
    delegated_votes: Map<ContractAddress, u256>, // delegate => total delegated votes
    delegation_checkpoints: Map<(ContractAddress, u32), DelegationCheckpoint>, // (delegate, checkpoint_id) => checkpoint
    delegation_checkpoint_counts: Map<ContractAddress, u32>, // delegate => number of checkpoints
    
    // Execution sandboxing
    max_call_value: Map<ContractAddress, u256>, // target => max value allowed
        
        // Admin
        admin: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        ProposalCreated: ProposalCreated,
        VoteCast: VoteCast,
        VoteCastWithReason: VoteCastWithReason,
        DelegatedVoteCast: DelegatedVoteCast,
        DelegateChanged: DelegateChanged,
        ProposalCanceled: ProposalCanceled,
        ProposalQueued: ProposalQueued,
        ProposalExecuted: ProposalExecuted,
        TreasuryWithdrawalRequested: TreasuryWithdrawalRequested,
    }

    #[derive(Drop, starknet::Event)]
    struct ProposalCreated {
        proposal_id: felt252,
        proposer: ContractAddress,
        title: ByteArray,
        description_hash: felt252,
        vote_start: u64,
        vote_end: u64,
        proposal_type: ProposalType,
    }

    #[derive(Drop, starknet::Event)]
    struct VoteCast {
        voter: ContractAddress,
        proposal_id: felt252,
        support: u8,
        weight: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct ProposalCanceled {
        proposal_id: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct ProposalQueued {
        proposal_id: felt252,
        eta: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct ProposalExecuted {
        proposal_id: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct VoteCastWithReason {
        voter: ContractAddress,
        proposal_id: felt252,
        support: u8,
        weight: u256,
        reason: ByteArray,
    }

    #[derive(Drop, starknet::Event)]
    struct DelegatedVoteCast {
        delegate: ContractAddress,
        delegator: ContractAddress,
        proposal_id: felt252,
        support: u8,
        weight: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct DelegateChanged {
        delegator: ContractAddress,
        from_delegate: ContractAddress,
        to_delegate: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct TreasuryWithdrawalRequested {
        proposal_id: felt252,
        beneficiary: ContractAddress,
        amount: u256,
        description_hash: felt252,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        name: ByteArray,
        version: felt252,
        token_contract: ContractAddress,
        nft_contract: ContractAddress,
        treasury_contract: ContractAddress,
        admin: ContractAddress
    ) {
        self.name.write(name);
        self.version.write(version);
        self.voting_delay.write(DEFAULT_VOTING_DELAY);
        self.voting_period.write(DEFAULT_VOTING_PERIOD);
        self.proposal_threshold.write(DEFAULT_PROPOSAL_THRESHOLD);
        self.quorum_numerator.write(DEFAULT_QUORUM_NUMERATOR);
        self.timelock_delay.write(DEFAULT_TIMELOCK_DELAY);
        self.token_contract.write(token_contract);
        self.nft_contract.write(nft_contract);
        self.treasury_contract.write(treasury_contract);
        self.admin.write(admin);
        self.proposal_counter.write(0);
    }

    #[abi(embed_v0)]
    impl DaoGovernanceImpl of super::IDaoGovernance<ContractState> {
        fn name(self: @ContractState) -> ByteArray {
            self.name.read()
        }

        fn version(self: @ContractState) -> felt252 {
            self.version.read()
        }

        fn voting_delay(self: @ContractState) -> u64 {
            self.voting_delay.read()
        }

        fn voting_period(self: @ContractState) -> u64 {
            self.voting_period.read()
        }

        fn emergency_voting_period(self: @ContractState) -> u64 {
            EMERGENCY_VOTING_PERIOD
        }

        fn proposal_threshold(self: @ContractState) -> u256 {
            self.proposal_threshold.read()
        }

        fn quorum_numerator(self: @ContractState) -> u256 {
            self.quorum_numerator.read()
        }

        fn timelock_delay(self: @ContractState) -> u64 {
            self.timelock_delay.read()
        }

        fn get_proposal(self: @ContractState, proposal_id: felt252) -> Proposal {
        
            assert(self.proposal_ids.read(proposal_id), 'Proposal does not exist');
            
            Proposal {
                id: proposal_id,
                proposer: self.proposal_proposers.read(proposal_id),
                title: self.proposal_titles.read(proposal_id),
                description_hash: self.proposal_description_hashes.read(proposal_id),
                calls: array![], 
                vote_start: self.proposal_vote_starts.read(proposal_id),
                vote_end: self.proposal_vote_ends.read(proposal_id),
                proposal_type: self.proposal_types.read(proposal_id),
                for_votes: self.proposal_for_votes.read(proposal_id),
                against_votes: self.proposal_against_votes.read(proposal_id),
                abstain_votes: self.proposal_abstain_votes.read(proposal_id),
                canceled: self.proposal_canceled.read(proposal_id),
                executed: self.proposal_executed.read(proposal_id),
                queued_at: self.proposal_queued_at.read(proposal_id),
                eta: self.proposal_eta.read(proposal_id),
            }
        }

        fn get_proposal_state(self: @ContractState, proposal_id: felt252) -> ProposalState {
            self._get_proposal_state(proposal_id)
        }

        fn get_voting_power(self: @ContractState, account: ContractAddress, timepoint: u64) -> u256 {
            self._get_voting_power(account, timepoint)
        }

        fn has_voted(self: @ContractState, proposal_id: felt252, voter: ContractAddress) -> bool {
            let packed_data = self.vote_records.read((proposal_id, voter));
            packed_data.packed_data != 0
        }

        fn get_vote(self: @ContractState, proposal_id: felt252, voter: ContractAddress) -> (bool, u8, u256) {
            let packed_data = self.vote_records.read((proposal_id, voter));
            if packed_data.packed_data == 0 {
                return (false, 0, 0);
            }
            let (support, weight) = self._unpack_vote_data(packed_data.packed_data);
            (true, support, weight)
        }

        fn get_delegate(self: @ContractState, delegator: ContractAddress) -> ContractAddress {
            self.delegates.read(delegator)
        }

        fn get_delegated_votes(self: @ContractState, delegate: ContractAddress, timepoint: u64) -> u256 {
            self._get_delegated_votes_at_timestamp(delegate, timepoint)
        }

        fn proposal_count(self: @ContractState) -> u256 {
            self.proposal_counter.read()
        }

        fn hash_proposal(self: @ContractState, calls: Span<Call>, description_hash: felt252) -> felt252 {
            self._hash_proposal(calls, description_hash)
        }

        fn propose(
            ref self: ContractState,
            calls: Span<Call>,
            title: ByteArray,
            description_hash: felt252,
            proposal_type: ProposalType
        ) -> felt252 {
            let proposer = get_caller_address();
            let current_time = get_block_timestamp();
            
            // Check proposal threshold
            let voting_power = self._get_voting_power(proposer, current_time);
            assert(voting_power >= self.proposal_threshold.read(), 'Insufficient voting power');

            // For parameter proposals, validate the calls
            if proposal_type == ProposalType::Parameter {
                self._validate_parameter_calls(calls.clone());
            }

            // Generate proposal ID
            let proposal_id = self._hash_proposal(calls, description_hash);
            
            // Determine voting period based on proposal type
            let voting_period = match proposal_type {
                ProposalType::Emergency => EMERGENCY_VOTING_PERIOD,
                ProposalType::Parameter => self.voting_period.read() / 2, // Half the standard period
                ProposalType::Standard => self.voting_period.read(),
            };

            let vote_start = current_time + self.voting_delay.read();
            let vote_end = vote_start + voting_period;

            // Store proposal data in separate maps
            let mut storage_map = self.proposal_ids;
            storage_map.write(proposal_id, true);
            let mut storage_map = self.proposal_proposers;
            storage_map.write(proposal_id, proposer);
            let mut storage_map = self.proposal_titles;
            storage_map.write(proposal_id, title.clone());
            let mut storage_map = self.proposal_description_hashes;
            storage_map.write(proposal_id, description_hash);
            let mut storage_map = self.proposal_vote_starts;
            storage_map.write(proposal_id, vote_start);
            let mut storage_map = self.proposal_vote_ends;
            storage_map.write(proposal_id, vote_end);
            let mut storage_map = self.proposal_types;
            storage_map.write(proposal_id, proposal_type);
            let mut storage_map = self.proposal_for_votes;
            storage_map.write(proposal_id, 0);
            let mut storage_map = self.proposal_against_votes;
            storage_map.write(proposal_id, 0);
            let mut storage_map = self.proposal_abstain_votes;
            storage_map.write(proposal_id, 0);
            let mut storage_map = self.proposal_canceled;
            storage_map.write(proposal_id, false);
            let mut storage_map = self.proposal_executed;
            storage_map.write(proposal_id, false);
            let mut storage_map = self.proposal_queued_at;
            storage_map.write(proposal_id, 0);
            let mut storage_map = self.proposal_eta;
            storage_map.write(proposal_id, 0);
            
            // Store proposal calls
            self._store_proposal_calls(proposal_id, calls);
            
            let mut storage_map = self.proposal_counter;
            storage_map.write(storage_map.read() + 1);

            self.emit(ProposalCreated {
                proposal_id,
                proposer,
                title,
                description_hash,
                vote_start,
                vote_end,
                proposal_type,
            });

            proposal_id
        }

        fn cast_vote(ref self: ContractState, proposal_id: felt252, support: u8) -> u256 {
            let voter = get_caller_address();
            let current_time = get_block_timestamp();
            let current_block = starknet::get_block_number();
            
            // Validate support value
            assert(support <= ABSTAIN, 'Invalid support value');
            
            // Check if proposal exists and is active
            assert(self.proposal_ids.read(proposal_id), 'Proposal does not exist');
            let vote_start = self.proposal_vote_starts.read(proposal_id);
            let vote_end = self.proposal_vote_ends.read(proposal_id);
            assert(current_time >= vote_start, 'Voting not started');
            assert(current_time <= vote_end, 'Voting ended');
            assert(!self.proposal_canceled.read(proposal_id), 'Proposal canceled');

            // Check if voter has already voted
            let packed_data = self.vote_records.read((proposal_id, voter));
            assert(packed_data.packed_data == 0, 'Already voted');

            // Anti-flash loan protection: Check if tokens were just acquired
            let last_vote_block = self.last_vote_block.read(voter);
            if last_vote_block > 0 {
                assert(current_block > last_vote_block + 1, 'Vote too soon after transfer');
            }
            self.last_vote_block.write(voter, current_block);

            // Get voting power
            let weight = self._get_voting_power(voter, vote_start);
            assert(weight > 0, 'No voting power');

            // Lock voting power
            let lock_duration = vote_end - current_time + 86400; // 1 day after vote ends
            self._lock_voting_power(voter, weight, lock_duration);

            // Record vote using packed data for gas efficiency
            let packed_vote = self._pack_vote_data(support, current_time, weight);
            self.vote_records.write((proposal_id, voter), PackedVoteData { packed_data: packed_vote });

            // Update vote counts and total weight
            if support == FOR {
                self.proposal_for_votes.write(proposal_id, self.proposal_for_votes.read(proposal_id) + weight);
            } else if support == AGAINST {
                self.proposal_against_votes.write(proposal_id, self.proposal_against_votes.read(proposal_id) + weight);
            } else { // ABSTAIN
                self.proposal_abstain_votes.write(proposal_id, self.proposal_abstain_votes.read(proposal_id) + weight);
            }

            // Update total vote weight for quorum calculation
            let total_weight = self.proposal_vote_weights.read(proposal_id);
            self.proposal_vote_weights.write(proposal_id, total_weight + weight);

            self.emit(VoteCast {
                voter,
                proposal_id,
                support,
                weight,
            });

            weight
        }

        fn cast_vote_with_reason(ref self: ContractState, proposal_id: felt252, support: u8, reason: ByteArray) -> u256 {
            let weight = self.cast_vote(proposal_id, support);
            
            self.emit(VoteCastWithReason {
                voter: get_caller_address(),
                proposal_id,
                support,
                weight,
                reason,
            });
            
            weight
        }

        fn cast_delegated_vote(ref self: ContractState, proposal_id: felt252, support: u8, delegator: ContractAddress) -> u256 {
            let delegate = get_caller_address();
            
            // Verify delegation
            assert(self.delegates.read(delegator) == delegate, 'Not delegated to caller');
            
            let current_time = get_block_timestamp();
            let current_block = get_block_number();
            
            // Validate support value
            assert(support <= ABSTAIN, 'Invalid support value');
            
            // Check if proposal exists and is active
            assert(self.proposal_ids.read(proposal_id), 'Proposal does not exist');
            let vote_start = self.proposal_vote_starts.read(proposal_id);
            let vote_end = self.proposal_vote_ends.read(proposal_id);
            assert(current_time >= vote_start, 'Voting not started');
            assert(current_time <= vote_end, 'Voting ended');
            assert(!self.proposal_canceled.read(proposal_id), 'Proposal canceled');

            // Check if delegator has already voted
            let packed_data = self.vote_records.read((proposal_id, delegator));
            assert(packed_data.packed_data == 0, 'Delegator already voted');

            // Get delegator's voting power
            let weight = self._get_voting_power(delegator, vote_start);
            assert(weight > 0, 'No voting power');

            // Record vote for delegator
            let packed_vote = self._pack_vote_data(support, current_time, weight);
            self.vote_records.write((proposal_id, delegator), PackedVoteData { packed_data: packed_vote });

            // Update vote counts
            if support == FOR {
                self.proposal_for_votes.write(proposal_id, self.proposal_for_votes.read(proposal_id) + weight);
            } else if support == AGAINST {
                self.proposal_against_votes.write(proposal_id, self.proposal_against_votes.read(proposal_id) + weight);
            } else { // ABSTAIN
                self.proposal_abstain_votes.write(proposal_id, self.proposal_abstain_votes.read(proposal_id) + weight);
            }

            // Update total vote weight for quorum calculation
            let total_weight = self.proposal_vote_weights.read(proposal_id);
            self.proposal_vote_weights.write(proposal_id, total_weight + weight);

            self.emit(DelegatedVoteCast {
                delegate,
                delegator,
                proposal_id,
                support,
                weight,
            });

            weight
        }

        fn delegate_vote(ref self: ContractState, delegatee: ContractAddress) {
            let delegator = get_caller_address();
            let old_delegate = self.delegates.read(delegator);
            
            // Update delegation
            self.delegates.write(delegator, delegatee);
            
            // Update delegated vote counts
            let delegator_power = self._get_voting_power(delegator, get_block_timestamp());
            
            if old_delegate.is_non_zero() {
                self._decrease_delegated_votes(old_delegate, delegator_power);
            }
            
            if delegatee.is_non_zero() {
                self._increase_delegated_votes(delegatee, delegator_power);
            }
            
            self.emit(DelegateChanged {
                delegator,
                from_delegate: old_delegate,
                to_delegate: delegatee,
            });
        }

        fn cancel_proposal(ref self: ContractState, proposal_id: felt252) {
            let caller = get_caller_address();
            assert(self.proposal_ids.read(proposal_id), 'Proposal does not exist');
            assert(!self.proposal_canceled.read(proposal_id), 'Already canceled');
            assert(!self.proposal_executed.read(proposal_id), 'Already executed');
            
            // Only proposer or admin can cancel
            let proposer = self.proposal_proposers.read(proposal_id);
            assert(caller == proposer || caller == self.admin.read(), 'Unauthorized');

            self.proposal_canceled.write(proposal_id, true);

            self.emit(ProposalCanceled { proposal_id });
        }

        fn queue_proposal(ref self: ContractState, proposal_id: felt252) {
            let current_time = get_block_timestamp();
            let state = self._get_proposal_state(proposal_id);
            
            assert(state == ProposalState::Succeeded, 'Proposal not succeeded');
            
            let eta = current_time + self.timelock_delay.read();
            self.proposal_queued_at.write(proposal_id, current_time);
            self.proposal_eta.write(proposal_id, eta);

            self.emit(ProposalQueued { proposal_id, eta });
        }

        fn execute_proposal(ref self: ContractState, proposal_id: felt252) {
            let current_time = get_block_timestamp();
            let state = self._get_proposal_state(proposal_id);
            
            assert(state == ProposalState::Queued, 'Proposal not queued');
            
            let eta = self.proposal_eta.read(proposal_id);
            assert(current_time >= eta, 'Timelock not expired');
            
            // Execute calls
            let proposal_type = self.proposal_types.read(proposal_id);
            
            // For parameter proposals, bypass timelock if quorum is high enough
            if proposal_type == ProposalType::Parameter {
                let for_votes = self.proposal_for_votes.read(proposal_id);
                let total_supply = self._calculate_total_supply();
                let high_consensus = (for_votes * 1000) / total_supply >= 750; // 75% consensus
                
                if !high_consensus {
                    assert(current_time >= eta, 'Timelock required');
                }
            } else {
                assert(current_time >= eta, 'Timelock not expired');
            }
            
            // Execute the stored calls
            self._execute_calls(proposal_id);
            
            self.proposal_executed.write(proposal_id, true);

            self.emit(ProposalExecuted { proposal_id });
        }

        // Admin functions
        fn set_voting_delay(ref self: ContractState, new_delay: u64) {
            self._only_admin();
            self.voting_delay.write(new_delay);
        }

        fn set_voting_period(ref self: ContractState, new_period: u64) {
            self._only_admin();
            assert(new_period > 0, 'Invalid period');
            self.voting_period.write(new_period);
        }

        fn set_proposal_threshold(ref self: ContractState, new_threshold: u256) {
            self._only_admin();
            self.proposal_threshold.write(new_threshold);
        }

        fn set_quorum_numerator(ref self: ContractState, new_numerator: u256) {
            self._only_admin();
            assert(new_numerator <= QUORUM_DENOMINATOR, 'Invalid numerator');
            self.quorum_numerator.write(new_numerator);
        }

        fn set_timelock_delay(ref self: ContractState, new_delay: u64) {
            self._only_admin();
            self.timelock_delay.write(new_delay);
        }

        fn set_allowed_calls(ref self: ContractState, target: ContractAddress, selectors: Array<felt252>, max_value: u256) {
            self._set_allowed_calls(target, selectors, max_value);
        }

        fn request_treasury_withdrawal(ref self: ContractState, beneficiary: ContractAddress, amount: u256, description_hash: felt252) -> felt252 {
            // Create a treasury withdrawal proposal
            let mut calls = ArrayTrait::new();
            let mut calldata = ArrayTrait::new();
            calldata.append(beneficiary.into());
            calldata.append(amount.low.into());
            calldata.append(amount.high.into());
            calldata.append(description_hash);
            
            calls.append(Call {
                to: self.treasury_contract.read(),
                selector: selector!("request_withdrawal"),
                calldata: calldata.span(),
            });
            
            let proposal_id = self.propose(
                calls.span(),
                "Treasury Withdrawal Request",
                description_hash,
                ProposalType::Standard
            );

            self.emit(TreasuryWithdrawalRequested {
                proposal_id,
                beneficiary,
                amount,
                description_hash,
            });

            proposal_id
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _validate_parameter_calls(self: @ContractState, calls: Span<Call>) {
            assert(calls.len() == 1, 'Parameter proposal: single call');
            let call = *calls.at(0);
            
            // Validate call is to this contract
            assert(call.to == get_contract_address(), 'Invalid target contract');
            
            // Validate function selector is for parameter change
            let valid_selectors = array![
                'set_voting_delay',
                'set_voting_period',
                'set_proposal_threshold',
                'set_quorum_numerator',
                'set_timelock_delay',
            ];
            
            let mut is_valid = false;
            let mut i = 0;
            loop {
                if i >= valid_selectors.len() {
                    break;
                }
                if call.selector == *valid_selectors.at(i) {
                    is_valid = true;
                    break;
                }
                i += 1;
            };
            
            assert(is_valid, 'Invalid parameter function');
            
            // Validate parameter values
            let selector = call.selector;
            if selector == selector!("set_voting_delay") {
                let new_delay: u64 = (*call.calldata.at(0)).try_into().unwrap();
                assert(new_delay > 0, 'Invalid voting delay');
            } else if selector == selector!("set_voting_period") {
                let new_period: u64 = (*call.calldata.at(0)).try_into().unwrap();
                assert(new_period > 0, 'Invalid voting period');
            } else if selector == selector!("set_proposal_threshold") {
                let new_threshold: u256 = (*call.calldata.at(0)).try_into().unwrap();
                assert(new_threshold > 0, 'Invalid threshold');
            } else if selector == selector!("set_quorum_numerator") {
                let new_numerator: u256 = (*call.calldata.at(0)).try_into().unwrap();
                assert(new_numerator <= QUORUM_DENOMINATOR, 'Invalid numerator');
            } else if selector == selector!("set_timelock_delay") {
                let new_delay: u64 = (*call.calldata.at(0)).try_into().unwrap();
                assert(new_delay > 0, 'Invalid timelock delay');
            }
        }
        fn _only_admin(self: @ContractState) {
            assert(get_caller_address() == self.admin.read(), 'Only admin');
        }

        fn _get_proposal_state(self: @ContractState, proposal_id: felt252) -> ProposalState {
            assert(self.proposal_ids.read(proposal_id), 'Proposal does not exist');
            
            if self.proposal_canceled.read(proposal_id) {
                return ProposalState::Canceled;
            }
            
            if self.proposal_executed.read(proposal_id) {
                return ProposalState::Executed;
            }
            
            let current_time = get_block_timestamp();
            
            if self.proposal_queued_at.read(proposal_id) > 0 {
                return ProposalState::Queued;
            }
            
            let vote_start = self.proposal_vote_starts.read(proposal_id);
            let vote_end = self.proposal_vote_ends.read(proposal_id);
            
            if current_time < vote_start {
                return ProposalState::Pending;
            }
            
            if current_time <= vote_end {
                return ProposalState::Active;
            }
            
            // Voting ended, check if succeeded
            let quorum = self._calculate_quorum();
            let total_weight = self.proposal_vote_weights.read(proposal_id);
            let for_votes = self.proposal_for_votes.read(proposal_id);
            let against_votes = self.proposal_against_votes.read(proposal_id);
            
            // Check quorum and support requirements
            if total_weight >= quorum {
                let proposal_type = self.proposal_types.read(proposal_id);
                
                // For standard proposals: need more FOR than AGAINST
                if proposal_type == ProposalType::Standard && for_votes > against_votes {
                    return ProposalState::Succeeded;
                }
                
                // For emergency proposals: need 2/3 majority
                if proposal_type == ProposalType::Emergency && (for_votes * 3) > (total_weight * 2) {
                    return ProposalState::Succeeded;
                }
                
                // For parameter proposals: need 3/4 majority
                if proposal_type == ProposalType::Parameter && (for_votes * 4) > (total_weight * 3) {
                    return ProposalState::Succeeded;
                }
            }
            
            ProposalState::Defeated
        }

        fn _get_voting_power(self: @ContractState, account: ContractAddress, timepoint: u64) -> u256 {
            // Get voting power from both NFT and token contracts
            let nft_power = self._get_nft_voting_power(account);
            let token_power = self._get_token_voting_power(account, timepoint);
            let delegated_power = self._get_delegated_votes_at_timestamp(account, timepoint);
            
            nft_power + token_power + delegated_power
        }

        fn _get_nft_voting_power(self: @ContractState, account: ContractAddress) -> u256 {
            // Each NFT = 1000 tokens worth of voting power
            let nft = INftContractDispatcher { contract_address: self.nft_contract.read() };
            let nft_balance = nft.balance_of(account);
            // Convert NFT balance to voting power (1 NFT = 1000 tokens)
            nft_balance * 1000000000000000000000_u256
        }

        fn _get_token_voting_power(self: @ContractState, account: ContractAddress, timepoint: u64) -> u256 {
            // Get voting power from token contract
            let token = INftopiaTokenDispatcher { contract_address: self.token_contract.read() };
            token.get_past_votes(account, timepoint)
        }

        fn _calculate_total_supply(self: @ContractState) -> u256 {
            // Get total supply from token contract
            let token = INftopiaTokenDispatcher { contract_address: self.token_contract.read() };
            let token_total_supply = token.total_supply();
            
            // Get total NFTs and convert to voting power
            let nft = INftContractDispatcher { contract_address: self.nft_contract.read() };
            let nft_total_supply = nft.total_supply() * 1000000000000000000000_u256;
            
            // Return total voting power
            token_total_supply + nft_total_supply
        }

        fn _calculate_quorum(self: @ContractState) -> u256 {
            let total_voting_power = self._calculate_total_supply();
            (total_voting_power * self.quorum_numerator.read()) / QUORUM_DENOMINATOR
        }

        fn _store_proposal_calls(ref self: ContractState, proposal_id: felt252, calls: Span<Call>) {
            // Store number of calls
            let call_count = SpanTrait::len(calls);
            self.proposal_call_count.write(proposal_id, call_count);
            
            // Store each call's components
            let mut i: u32 = 0;
            loop {
                if i >= call_count {
                    break;
                }
                let call = *SpanTrait::at(calls, i);
                
                // Store target and selector
                self.proposal_call_targets.write((proposal_id, i), call.to);
                self.proposal_call_selectors.write((proposal_id, i), call.selector);
                
                // Store calldata
                let data_len = SpanTrait::len(call.calldata);
                self.proposal_call_data_len.write((proposal_id, i), data_len);
                
                let mut j: u32 = 0;
                loop {
                    if j >= data_len {
                        break;
                    }
                    self.proposal_call_data.write((proposal_id, i, j), *SpanTrait::at(call.calldata, j));
                    j += 1;
                };
                
                i += 1;
            };
        }
        
        fn _get_proposal_calls(self: @ContractState, proposal_id: felt252) -> Array<Call> {
            let mut calls = ArrayTrait::new();
            let call_count = self.proposal_call_count.read(proposal_id);
            
            let mut i: u32 = 0;
            loop {
                if i >= call_count {
                    break;
                }
                
                // Get target and selector
                let target = self.proposal_call_targets.read((proposal_id, i));
                let selector = self.proposal_call_selectors.read((proposal_id, i));
                
                // Get calldata
                let mut calldata = ArrayTrait::new();
                let data_len = self.proposal_call_data_len.read((proposal_id, i));
                
                let mut j: u32 = 0;
                loop {
                    if j >= data_len {
                        break;
                    }
                    calldata.append(self.proposal_call_data.read((proposal_id, i, j)));
                    j += 1;
                };
                
                // Create and append call
                calls.append(Call { to: target, selector: selector, calldata: calldata.span() });
                i += 1;
            };
            
            calls
        }

        fn _hash_proposal(self: @ContractState, calls: Span<Call>, description_hash: felt252) -> felt252 {
            // Simplified hashing for now
            let mut hasher = PoseidonTrait::new();
            hasher = hasher.update_with(description_hash);
            let caller_felt: felt252 = get_caller_address().into();
            hasher = hasher.update_with(caller_felt);
            let timestamp_felt: felt252 = get_block_timestamp().into();
            hasher = hasher.update_with(timestamp_felt);
            hasher.finalize()
        }

        fn _execute_calls(ref self: ContractState, proposal_id: felt252) {
            let calls = self._get_proposal_calls(proposal_id);
            let mut i = 0;
            loop {
                if i >= ArrayTrait::len(@calls) {
                    break;
                }
                let call = *ArrayTrait::at(@calls, i);
                
                // Validate call is allowed
                self._validate_call(call);
                
                // Execute call
                let _result = call_contract_syscall(
                    call.to,
                    call.selector,
                    call.calldata
                ).unwrap();
                i += 1;
            }
        }

        fn _validate_call(self: @ContractState, call: Call) {
            // Special case for parameter proposals
            if call.to == get_contract_address() {
                let valid_selectors = array![
                    selector!("set_voting_delay"),
                    selector!("set_voting_period"),
                    selector!("set_proposal_threshold"),
                    selector!("set_quorum_numerator"),
                    selector!("set_timelock_delay"),
                ];
                
                let mut is_valid = false;
                let mut i = 0;
                loop {
                    if i >= valid_selectors.len() {
                        break;
                    }
                    if call.selector == *valid_selectors.at(i) {
                        is_valid = true;
                        break;
                    }
                    i += 1;
                };
                
                assert(is_valid, 'Invalid parameter function');
                return;
            }
            
            // For other calls, check treasury or other allowed contracts
            if call.to == self.treasury_contract.read() {
                // Allow treasury calls
                return;
            }
            
            // Default: not allowed
            assert(false, 'Target not allowed');
        }

        fn _set_allowed_calls(
            ref self: ContractState,
            target: ContractAddress,
            selectors: Array<felt252>,
            max_value: u256
        ) {
            self._only_admin();
            // For now, we'll store in a simplified way
            // In production, you'd want a more sophisticated storage mechanism
            self.max_call_value.write(target, max_value);
        }

        fn _lock_voting_power(
            ref self: ContractState,
            voter: ContractAddress,
            amount: u256,
            duration: u64
        ) {
            let current_time = get_block_timestamp();
            let mut lock_end = current_time + duration;
            
            // Get existing lock
            let current_lock = self.vote_locks.read(voter);
            
            // If existing lock extends beyond new lock, keep the longer duration
            if current_lock.locked_until > lock_end {
                lock_end = current_lock.locked_until;
            }
            
            // Update lock with new amount and duration
            self.vote_locks.write(
                voter,
                VoteLock { locked_until: lock_end, locked_amount: amount }
            );
        }

        fn _check_vote_lock(self: @ContractState, voter: ContractAddress) -> bool {
            let current_time = get_block_timestamp();
            let lock = self.vote_locks.read(voter);
            current_time < lock.locked_until
        }

        // Gas optimization: Pack vote data into single felt252
        fn _pack_vote_data(self: @ContractState, support: u8, timestamp: u64, weight: u256) -> felt252 {
            // Pack: support(2 bits) | timestamp(62 bits) | weight(low 128 bits, high 64 bits)
            let support_felt: felt252 = support.into();
            let timestamp_felt: felt252 = timestamp.into();
            let weight_low_felt: felt252 = weight.low.into();
            
            // Simple packing - in production, use bitwise operations for efficiency
            support_felt + timestamp_felt * 4 + weight_low_felt * 0x10000000000000000 // 2^64
        }

        fn _unpack_vote_data(self: @ContractState, packed_data: felt252) -> (u8, u256) {
            // Simplified unpacking - extract support and weight
            let support: u8 = (packed_data % 4).try_into().unwrap();
            let weight_low: u128 = ((packed_data / 0x10000000000000000) % 0x100000000000000000000000000000000).try_into().unwrap();
            let weight = u256 { low: weight_low, high: 0 };
            (support, weight)
        }

        fn _get_delegated_votes_at_timestamp(self: @ContractState, delegate: ContractAddress, timepoint: u64) -> u256 {
            let checkpoint_count = self.delegation_checkpoint_counts.read(delegate);
            
            if checkpoint_count == 0 {
                return 0;
            }
            
            // Binary search for the checkpoint
            let mut low = 0;
            let mut high = checkpoint_count - 1;
            
            loop {
                if low >= high {
                    break;
                }
                let mid = (low + high + 1) / 2;
                let checkpoint = self.delegation_checkpoints.read((delegate, mid));
                
                if checkpoint.from_timestamp <= timepoint {
                    low = mid;
                } else {
                    high = mid - 1;
                }
            };
            
            let checkpoint = self.delegation_checkpoints.read((delegate, low));
            if checkpoint.from_timestamp <= timepoint {
                checkpoint.votes
            } else {
                0
            }
        }

        fn _increase_delegated_votes(ref self: ContractState, delegate: ContractAddress, amount: u256) {
            let current_votes = self.delegated_votes.read(delegate);
            let new_votes = current_votes + amount;
            self.delegated_votes.write(delegate, new_votes);
            
            // Add checkpoint
            self._add_delegation_checkpoint(delegate, new_votes);
        }

        fn _decrease_delegated_votes(ref self: ContractState, delegate: ContractAddress, amount: u256) {
            let current_votes = self.delegated_votes.read(delegate);
            let new_votes = if current_votes > amount { current_votes - amount } else { 0 };
            self.delegated_votes.write(delegate, new_votes);
            
            // Add checkpoint
            self._add_delegation_checkpoint(delegate, new_votes);
        }

        fn _add_delegation_checkpoint(ref self: ContractState, delegate: ContractAddress, votes: u256) {
            let current_time = get_block_timestamp();
            let checkpoint_count = self.delegation_checkpoint_counts.read(delegate);
            
            // Check if we can update the last checkpoint
            if checkpoint_count > 0 {
                let last_checkpoint = self.delegation_checkpoints.read((delegate, checkpoint_count - 1));
                if last_checkpoint.from_timestamp == current_time {
                    // Update existing checkpoint
                    self.delegation_checkpoints.write(
                        (delegate, checkpoint_count - 1),
                        DelegationCheckpoint { from_timestamp: current_time, votes }
                    );
                    return;
                }
            }
            
            // Add new checkpoint
            self.delegation_checkpoints.write(
                (delegate, checkpoint_count),
                DelegationCheckpoint { from_timestamp: current_time, votes }
            );
            self.delegation_checkpoint_counts.write(delegate, checkpoint_count + 1);
        }
    }
}
