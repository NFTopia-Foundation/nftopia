// Dynamic Metadata Module for NFTs

use starknet::ContractAddress;
use core::array::ArrayTrait;
use core::hash::pedersen::pedersen;
use core::felt252;
use core::traits::Into;
use core::byte_array::ByteArray;
use starknet::get_caller_address;
use starknet::event::EventEmitter;
use starknet::storage::{StorageMapReadAccess, StorageMapWriteAccess, Map};
use crate::modules::nft_contract::NftContractImpl;

#[event]
#[derive(Drop, starknet::Event)]
enum MetadataEvent {
    MetadataUpdated: (token_id: u256, uri_hash: felt252, version: u32),
    MetadataFrozen: (token_id: u256),
}

#[storage]
struct Storage {
    // token_id => packed URI (as ByteArray)
    metadata_uris: Map<u256, ByteArray>,
    // token_id => frozen flag
    frozen: Map<u256, bool>,
    // token_id => version counter
    metadata_version: Map<u256, u32>,
}

#[generate_trait]
impl DynamicMetadata of IDynamicMetadata {
    // Update metadata URI (only owner/approved, not frozen)
    fn update_metadata(ref self: ContractState, token_id: u256, new_uri: ByteArray) {
        // Ownership/approval check
        let caller = get_caller_address();
        assert!(NftContractImpl::_is_approved_or_owner(@self, caller, token_id), 'Not owner or approved');
        // Check not frozen
        assert!(!self.frozen.read(token_id), 'Metadata is frozen');
        // Update URI
        self.metadata_uris.write(token_id, new_uri.clone());
        // Increment version
        let version = self.metadata_version.read(token_id) + 1;
        self.metadata_version.write(token_id, version);
        // Emit event with hash
        let uri_hash = pedersen_arr(new_uri.data());
        self.emit(MetadataEvent::MetadataUpdated(token_id, uri_hash, version));
    }

    // Freeze metadata (irreversible)
    fn freeze_metadata(ref self: ContractState, token_id: u256) {
        let caller = get_caller_address();
        assert!(NftContractImpl::_is_approved_or_owner(@self, caller, token_id), 'Not owner or approved');
        self.frozen.write(token_id, true);
        self.emit(MetadataEvent::MetadataFrozen(token_id));
    }

    // Get metadata URI
    fn get_metadata(self: @ContractState, token_id: u256) -> ByteArray {
        self.metadata_uris.read(token_id)
    }

    // Get metadata version
    fn get_metadata_version(self: @ContractState, token_id: u256) -> u32 {
        self.metadata_version.read(token_id)
    }

    // Is metadata frozen?
    fn is_frozen(self: @ContractState, token_id: u256) -> bool {
        self.frozen.read(token_id)
    }
}

// Helper: Pedersen hash of array
fn pedersen_arr(arr: @Array<felt252>) -> felt252 {
    let mut hash = 0;
    let mut i = 0;
    while i < arr.len() {
        hash = pedersen(hash, arr.at(i));
        i += 1;
    }
    hash
} 