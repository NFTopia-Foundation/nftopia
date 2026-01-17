use starknet::ContractAddress;

#[starknet::interface]
pub trait IDynamicMetadata<TContractState> {
    fn update_metadata(
        ref self: TContractState,
        token_id: u256,
        new_uri: felt252
    );
    fn get_metadata(self: @TContractState, token_id: u256) -> felt252;
    fn set_updater(ref self: TContractState, updater: ContractAddress, allowed: bool);
}

#[derive(Drop, Serde, starknet::Event)]
pub struct MetadataUpdated {
    pub token_id: u256,
    pub old_uri: felt252,
    pub new_uri: felt252,
    pub updated_by: ContractAddress
}

#[derive(Drop, Serde, starknet::Event)]
pub struct UpdaterChanged {
    pub updater: ContractAddress,
    pub status: bool, // true=added, false=removed
    pub changed_by: ContractAddress
}

#[starknet::component]
pub mod DynamicMetadataComponent {
    use super::{IDynamicMetadata, MetadataUpdated, UpdaterChanged};
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{
        StorageMapReadAccess, StorageMapWriteAccess, StoragePointerWriteAccess, StoragePointerReadAccess, Map
    };

    #[storage]
    pub struct Storage {
        base_uri: felt252,
        token_uris: Map<u256, felt252>,
        approved_updaters: Map<ContractAddress, bool>,
        locked: bool // For reentrancy protection
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        MetadataUpdated: MetadataUpdated,
        UpdaterChanged: UpdaterChanged
    }

    #[embeddable_as(DynamicMetadata)]
    pub impl DynamicMetadataImpl<
        TContractState, +HasComponent<TContractState>
    > of IDynamicMetadata<ComponentState<TContractState>> {
        fn update_metadata(
            ref self: ComponentState<TContractState>,
            token_id: u256,
            new_uri: felt252
        ) {
            // Reentrancy check
            assert(!self.locked.read(), 'Reentrancy detected');
            self.locked.write(true);

            // Access control
            let caller = get_caller_address();
            assert!(self.approved_updaters.read(caller), "Caller not authorized to update metadata");

            // Get old URI (defaults to base_uri if not set)
            let old_uri = self.token_uris.read(token_id);

            // Update storage
            self.token_uris.write(token_id, new_uri);

            // Emit event
            self.emit(MetadataUpdated {
                token_id,
                old_uri,
                new_uri,
                updated_by: caller
            });

            // Release lock
            self.locked.write(false);
        }

        fn get_metadata(
            self: @ComponentState<TContractState>,
            token_id: u256
        ) -> felt252 {
            return self.token_uris.read(token_id);
        }

        fn set_updater(
            ref self: ComponentState<TContractState>,
            updater: ContractAddress,
            allowed: bool
        ) {
            let caller = get_caller_address();
            assert!(self.approved_updaters.read(caller), "Only existing updaters can modify permissions");

            self.approved_updaters.write(updater, allowed);
            self.emit(UpdaterChanged {
                updater,
                status: allowed,
                changed_by: caller
            });
        }
    }

    #[generate_trait]
    pub impl InternalImpl<TContractState, +HasComponent<TContractState>> of InternalTrait<TContractState> {
        fn _initialize(
            ref self: ComponentState<TContractState>,
            base_uri: felt252,
            initial_updater: ContractAddress
        ) {
            self.base_uri.write(base_uri);
            self.approved_updaters.write(initial_updater, true);
        }
    }
}