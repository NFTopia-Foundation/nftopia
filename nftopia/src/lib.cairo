/// Interface representing `HelloContract`.
/// This interface allows modification and retrieval of the contract balance.
#[starknet::interface]
pub trait IHelloStarknet<TContractState> {
    /// Increase contract balance.
    fn increase_balance(ref self: TContractState, amount: felt252);
    /// Retrieve contract balance.
    fn get_balance(self: @TContractState) -> felt252;
}

/// Simple contract for managing balance.
#[starknet::contract]
mod HelloStarknet {
    use core::starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        balance: felt252,
    }

    #[abi(embed_v0)]
    impl HelloStarknetImpl of super::IHelloStarknet<ContractState> {
        fn increase_balance(ref self: ContractState, amount: felt252) {
            assert(amount != 0, 'Amount cannot be 0');
            self.balance.write(self.balance.read() + amount);
        }

        fn get_balance(self: @ContractState) -> felt252 {
            self.balance.read()
        }
    }
}

/// Interface for CollectionFactory contract.
#[starknet::interface]
pub trait ICollectionFactory<TContractState> {
    /// Deploys a new NFT collection and tracks it.
    fn create_collection(ref self: TContractState);

    /// Fetches collections created by a user.
    fn get_user_collections(self: @TContractState, user: ContractAddress) -> Array<ContractAddress>;
}

/// @title CollectionFactory Contract
/// @notice This contract allows users to create and manage NFT collections.
/// @dev Implements the ICollectionFactory interface.

/// Contract for managing NFT collections.
#[starknet::contract]
mod CollectionFactory {
    use core::starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use core::starknet::contract_address::ContractAddress;

    #[storage]
    struct Storage {
        collections: Map<ContractAddress, bool>,
        user_collections: Map<ContractAddress, Array<ContractAddress>>,
    }

    #[abi(embed_v0)]
    impl CollectionFactoryImpl of super::ICollectionFactory<ContractState> {
        /// @notice Deploys a new NFT collection and tracks it.
        /// @dev Emits a CollectionCreated event upon successful creation.
        /// @param self The contract state.
        fn create_collection(ref self: ContractState) {
            let caller = get_caller_address();
            let new_collection_address = deploy_infi_contract();

            // Update storage mappings
            self.collections.write(new_collection_address, true);
            let mut user_collections = self.user_collections.read(caller).unwrap_or_default();
            user_collections.append(new_collection_address);
            self.user_collections.write(caller, user_collections);

            // Emit event
            emit CollectionCreated { creator: caller, collection: new_collection_address };
        }

        /// @notice Fetches collections created by a specific user.
        /// @param user The address of the user.
        /// @return An array of collection addresses created by the user.
        fn get_user_collections(self: @ContractState, user: ContractAddress) -> Array<ContractAddress> {
            self.user_collections.read(user).unwrap_or_default()
        }
    }

    /// Event emitted when a new collection is created.
    #[event]
    struct CollectionCreated {
        creator: ContractAddress,
        collection: ContractAddress,
    }

    /// Helper function to deploy a new INFI contract.
    fn deploy_infi_contract() -> ContractAddress {
        // Logic for deploying the INFI contract goes here.
        // Placeholder return value for now.
        ContractAddress::default()
    }

    /// Helper function to get the caller's address.
    fn get_caller_address() -> ContractAddress {
        // Logic to retrieve the caller's address.
        // Placeholder return value for now.
        ContractAddress::default()
    }
}
