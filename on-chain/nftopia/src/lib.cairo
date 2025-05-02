use starknet::{
    ContractAddress, get_caller_address, contract_address_const,
    ClassHash, deploy_syscall
};
use core::array::ArrayTrait;
use core::traits::TryInto;
use core::option::OptionTrait;
use core::result::ResultTrait;

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

/// Interface for the INFI NFT contract
#[starknet::interface]
pub trait IINFI<TContractState> {
    fn initialize(ref self: TContractState, name: felt252, symbol: felt252, owner: ContractAddress);
}

/// Interface for CollectionFactory contract.
#[starknet::interface]
pub trait ICollectionFactory<TContractState> {
    /// Deploys a new NFT collection and tracks it.
    fn create_collection(
        ref self: TContractState, 
        name: felt252, 
        symbol: felt252
    ) -> ContractAddress;

    /// Fetches collections created by a user.
    fn get_user_collections(self: @TContractState, user: ContractAddress) -> Array<ContractAddress>;
}

/// @title CollectionFactory Contract
/// @notice This contract allows users to create and manage NFT collections.
/// @dev Implements the ICollectionFactory interface for NFT collection management.
#[starknet::contract]
mod CollectionFactory {
    use super::{
        ContractAddress, get_caller_address, contract_address_const,
        ClassHash, deploy_syscall, ArrayTrait, 
        IINFI, IINFIDispatcherTrait, IINFIDispatcher
    };
    use core::hash::LegacyHash;

    #[storage]
    struct Storage {
        collections: LegacyMap<ContractAddress, bool>,
        user_collections: LegacyMap<ContractAddress, Array<ContractAddress>>,
        infi_class_hash: ClassHash,
        collection_count: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    struct CollectionCreated {
        creator: ContractAddress,
        collection: ContractAddress,
        name: felt252,
        symbol: felt252
    }

    #[constructor]
    fn constructor(ref self: ContractState, infi_hash: ClassHash) {
        self.infi_class_hash.write(infi_hash);
        self.collection_count.write(0);
    }

    #[abi(embed_v0)]
    impl CollectionFactoryImpl of super::ICollectionFactory<ContractState> {
        fn create_collection(
            ref self: ContractState, 
            name: felt252, 
            symbol: felt252
        ) -> ContractAddress {
            // Input validation
            assert(name != 0, 'Name cannot be empty');
            assert(symbol != 0, 'Symbol cannot be empty');
            
            let caller = get_caller_address();
            
            // Generate unique salt using counter
            let count = self.collection_count.read();
            let salt = LegacyHash::hash(count, caller);
            self.collection_count.write(count + 1);
            
            // Deploy new INFI contract
            let mut constructor_args: Array<felt252> = ArrayTrait::new();
            constructor_args.append(name);
            constructor_args.append(symbol);
            constructor_args.append(caller.into());

            let (new_collection_address, _) = deploy_syscall(
                self.infi_class_hash.read(),
                salt, 
                constructor_args.span()
            ).unwrap();

            // Update storage mappings
            self.collections.write(new_collection_address, true);
            let mut user_collections = self.user_collections.read(caller).unwrap_or(ArrayTrait::new());
            user_collections.append(new_collection_address);
            self.user_collections.write(caller, user_collections);

            // Emit event with more details
            self.emit(CollectionCreated { 
                creator: caller, 
                collection: new_collection_address,
                name: name,
                symbol: symbol
            });

            new_collection_address
        }

        fn get_user_collections(self: @ContractState, user: ContractAddress) -> Array<ContractAddress> {
            self.user_collections.read(user).unwrap_or(ArrayTrait::new())
        }
    }
}
