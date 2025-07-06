#[starknet::contract]
#[feature("deprecated_legacy_map")]
mod Infi {
    use starknet::{
        ContractAddress, get_caller_address, storage::{StorageMapReadAccess, StorageMapWriteAccess},
    };
    use core::traits::Into;
    use core::traits::Default;


    #[derive(Drop, starknet::Event)]
    struct TokenMinted {
        token_id: u256,
        owner: ContractAddress,
        uri: felt252,
        creator: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct TokenTransferred {
        token_id: u256,
        from: ContractAddress,
        to: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct CollectionUpdated {
        token_id: u256,
        old_collection: ContractAddress,
        new_collection: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        TokenMinted: TokenMinted,
        TokenTransferred: TokenTransferred,
        CollectionUpdated: CollectionUpdated,
    }

    #[storage]
    struct Storage {
        token_owner: LegacyMap<u256, ContractAddress>,
        token_uri: LegacyMap<u256, felt252>,
        token_collection: LegacyMap<u256, ContractAddress>,
    }


    #[starknet::interface]
    pub trait IInfi<TContractState> {
        fn mint(
            ref self: TContractState,
            recipient: ContractAddress,
            token_id: u256,
            uri: felt252,
            creator: ContractAddress,
        );
        fn transfer(
            ref self: TContractState, from: ContractAddress, to: ContractAddress, token_id: u256,
        );
        fn owner_of(self: @TContractState, token_id: u256) -> ContractAddress;
        fn token_uri(self: @TContractState, token_id: u256) -> felt252;
        fn get_collection(self: @TContractState, token_id: u256) -> ContractAddress;
        fn set_collection(ref self: TContractState, token_id: u256, collection: ContractAddress);
    }


    #[abi(embed_v0)]
    impl InfiImpl of IInfi<ContractState> {
        fn mint(
            ref self: ContractState,
            recipient: ContractAddress,
            token_id: u256,
            uri: felt252,
            creator: ContractAddress,
        ) {
            let current_owner = self.token_owner.read(token_id);

            assert(current_owner.into() == 0, 'Token already minted');

            self.token_owner.write(token_id, recipient);
            self.token_uri.write(token_id, uri);

            self.emit(Event::TokenMinted(TokenMinted { token_id, owner: recipient, uri, creator }));
        }

        fn transfer(
            ref self: ContractState, from: ContractAddress, to: ContractAddress, token_id: u256,
        ) {
            let current_owner = self.token_owner.read(token_id);
            assert(current_owner == from, 'Not the owner');

            self.token_owner.write(token_id, to);

            self.emit(Event::TokenTransferred(TokenTransferred { token_id, from, to }));
        }

        fn owner_of(self: @ContractState, token_id: u256) -> ContractAddress {
            self.token_owner.read(token_id)
        }

        fn token_uri(self: @ContractState, token_id: u256) -> felt252 {
            self.token_uri.read(token_id)
        }

        fn get_collection(self: @ContractState, token_id: u256) -> ContractAddress {
            self.token_collection.read(token_id)
        }

        fn set_collection(ref self: ContractState, token_id: u256, collection: ContractAddress) {
            let current_owner = self.token_owner.read(token_id);
            assert(current_owner == get_caller_address(), 'Not the owner');

            let old_collection = self.token_collection.read(token_id);
            self.token_collection.write(token_id, collection);

            self
                .emit(
                    Event::CollectionUpdated(
                        CollectionUpdated { token_id, old_collection, new_collection: collection },
                    ),
                );
        }
    }
}

