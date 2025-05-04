// NFT Contract Module (ERC721-like)

use starknet::ContractAddress;
use core::byte_array::ByteArray;

/// Interface for the NFT Contract Module
#[starknet::interface]
pub trait INftContract<TContractState> {
    // View functions
    fn owner_of(self: @TContractState, token_id: u256) -> ContractAddress;
    fn token_uri(self: @TContractState, token_id: u256) -> ByteArray;
    fn balance_of(self: @TContractState, owner: ContractAddress) -> u256;
    fn get_approved(self: @TContractState, token_id: u256) -> ContractAddress;
    fn is_approved_for_all(self: @TContractState, owner: ContractAddress, operator: ContractAddress) -> bool;
    fn exists(self: @TContractState, token_id: u256) -> bool;
    
    // State-changing functions
    fn mint(ref self: TContractState, to: ContractAddress, token_id: u256, uri: ByteArray);
    fn transfer_from(ref self: TContractState, from: ContractAddress, to: ContractAddress, token_id: u256);
    fn approve(ref self: TContractState, to: ContractAddress, token_id: u256);
    fn set_approval_for_all(ref self: TContractState, operator: ContractAddress, approved: bool);
}

/// Implementation of the NFT Contract Module
#[starknet::contract]
pub mod NftContract {
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use core::num::traits::zero::Zero;
    use core::byte_array::ByteArray;
    use core::traits::Into;
    use starknet::event::EventEmitter;
    use starknet::storage::{StorageMapReadAccess, StorageMapWriteAccess, Map};
    
    // Import event types
    use crate::events::nft_events::{Mint, Transfer, Approval, ApprovalForAll};
    
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Mint: Mint,
        Transfer: Transfer,
        Approval: Approval,
        ApprovalForAll: ApprovalForAll,
    }
    
    #[storage]
    struct Storage {
        // Token ownership mapping: token_id => owner
        owners: Map<u256, ContractAddress>,
        // Token balance mapping: owner => balance
        balances: Map<ContractAddress, u256>,
        // Token URI mapping: token_id => URI
        token_uris: Map<u256, ByteArray>,
        // Token approval mapping: token_id => approved_address
        token_approvals: Map<u256, ContractAddress>,
        // Operator approval mapping: (owner, operator) => approved
        operator_approvals: Map<(ContractAddress, ContractAddress), bool>,
        // Token creator mapping: token_id => creator
        creators: Map<u256, ContractAddress>,
        // Token collection mapping: token_id => collection
        collections: Map<u256, ContractAddress>,
    }
    
    #[generate_trait]
    impl InternalImpl of InternalTrait {
        // Check if a token exists
        fn _exists(self: @ContractState, token_id: u256) -> bool {
            let owner = self.owners.read(token_id);
            !owner.is_zero()
        }
        
        // Check if an address is the owner or approved for a token
        fn _is_approved_or_owner(self: @ContractState, spender: ContractAddress, token_id: u256) -> bool {
            let owner = self.owners.read(token_id);
            assert(!owner.is_zero(), 'Token does not exist');
            
            spender == owner || 
            spender == self.token_approvals.read(token_id) || 
            self.operator_approvals.read((owner, spender))
        }
        
        // Transfer a token between addresses
        fn _transfer(ref self: ContractState, from: ContractAddress, to: ContractAddress, token_id: u256) {
            // Validate addresses
            assert(!from.is_zero(), 'Transfer from zero address');
            assert(!to.is_zero(), 'Transfer to zero address');
            
            // Get current owner and validate ownership
            let owner = self.owners.read(token_id);
            assert(!owner.is_zero(), 'Token does not exist');
            assert(owner == from, 'From is not the owner');
            
            // Clear approvals for this token
            self.token_approvals.write(token_id, Zero::zero());
            
            // Update balances
            self.balances.write(from, self.balances.read(from) - 1);
            self.balances.write(to, self.balances.read(to) + 1);
            
            // Update ownership
            self.owners.write(token_id, to);
            
            // Emit transfer event
            self.emit(Event::Transfer(Transfer { from, to, token_id }));
        }
    }
    
    // Implementation of the NFT contract interface
    #[abi(embed_v0)]
    impl NftContractImpl of super::INftContract<ContractState> {
        // View functions
        
        // Get the owner of a token
        fn owner_of(self: @ContractState, token_id: u256) -> ContractAddress {
            let owner = self.owners.read(token_id);
            assert(!owner.is_zero(), 'Token does not exist');
            owner
        }
        
        // Get the token URI
        fn token_uri(self: @ContractState, token_id: u256) -> ByteArray {
            assert(InternalImpl::_exists(self, token_id), 'Token does not exist');
            self.token_uris.read(token_id)
        }
        
        // Get the balance of an owner
        fn balance_of(self: @ContractState, owner: ContractAddress) -> u256 {
            assert(!owner.is_zero(), 'Balance query for zero address');
            self.balances.read(owner)
        }
        
        // Get the approved address for a token
        fn get_approved(self: @ContractState, token_id: u256) -> ContractAddress {
            assert(InternalImpl::_exists(self, token_id), 'Token does not exist');
            self.token_approvals.read(token_id)
        }
        
        // Check if an operator is approved for all tokens of an owner
        fn is_approved_for_all(self: @ContractState, owner: ContractAddress, operator: ContractAddress) -> bool {
            self.operator_approvals.read((owner, operator))
        }
        
        // Check if a token exists
        fn exists(self: @ContractState, token_id: u256) -> bool {
            InternalImpl::_exists(self, token_id)
        }
        
        // State-changing functions
        
        // Mint a new token
        fn mint(ref self: ContractState, to: ContractAddress, token_id: u256, uri: ByteArray) {
            // Validate parameters
            assert(!to.is_zero(), 'Mint to zero address');
            assert(!InternalImpl::_exists(@self, token_id), 'Token already exists');
            
            // Get caller as creator
            let creator = get_caller_address();
            
            // Clone URI for event emission
            let uri_ref = uri.clone();
            
            // Set token data
            self.owners.write(token_id, to);
            self.token_uris.write(token_id, uri);
            self.creators.write(token_id, creator);
            self.collections.write(token_id, Zero::zero());
            
            // Update balance
            self.balances.write(to, self.balances.read(to) + 1);
            
            // Emit mint event
            self.emit(Event::Mint(Mint {
                token_id,
                to,
                creator,
                uri: uri_ref,
                collection: Zero::zero()
            }));
        }
        
        // Transfer a token from one address to another
        fn transfer_from(ref self: ContractState, from: ContractAddress, to: ContractAddress, token_id: u256) {
            // Get caller
            let caller = get_caller_address();
            
            // Check authorization
            assert(
                InternalImpl::_is_approved_or_owner(@self, caller, token_id),
                'Caller not authorized'
            );
            
            // Transfer the token
            InternalImpl::_transfer(ref self, from, to, token_id);
        }
        
        // Approve an address to transfer a token
        fn approve(ref self: ContractState, to: ContractAddress, token_id: u256) {
            // Get owner and caller
            let owner = self.owners.read(token_id);
            let caller = get_caller_address();
            
            // Validate owner and authorization
            assert(!owner.is_zero(), 'Token does not exist');
            assert(
                owner == caller || self.operator_approvals.read((owner, caller)),
                'Caller not authorized'
            );
            
            // Validate approval address
            assert(!to.is_zero(), 'Approve to zero address');
            
            // Set approval
            self.token_approvals.write(token_id, to);
            
            // Emit approval event
            self.emit(Event::Approval(Approval { owner, approved: to, token_id }));
        }
        
        // Set approval for all tokens of an owner
        fn set_approval_for_all(ref self: ContractState, operator: ContractAddress, approved: bool) {
            // Get caller
            let caller = get_caller_address();
            
            // Validate operator
            assert(!operator.is_zero(), 'Approve to zero address');
            assert(caller != operator, 'Self approval');
            
            // Set operator approval
            self.operator_approvals.write((caller, operator), approved);
            
            // Emit approval for all event
            self.emit(Event::ApprovalForAll(ApprovalForAll {
                owner: caller,
                operator,
                approved
            }));
        }
    }
}
