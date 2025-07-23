#[starknet::contract]
pub mod CollectionFactory {
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::contract_address_const;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

    use core::array::{Array, ArrayTrait};

    #[storage]
    struct Storage {
        collections: Map<ContractAddress, bool>,
        user_collections: Map<(ContractAddress, u32), ContractAddress>,
        user_collection_count: Map<ContractAddress, u32>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        CollectionCreated: CollectionCreated,
    }

    #[derive(Drop, starknet::Event)]
    struct CollectionCreated {
        creator: ContractAddress,
        collection: ContractAddress,
    }

    #[starknet::interface]
    trait ICollectionFactory<TContractState> {
        fn create_collection(ref self: TContractState) -> ContractAddress;
        fn get_user_collections(
            self: @TContractState, user: ContractAddress,
        ) -> Array<ContractAddress>;
    }

    #[abi(embed_v0)]
    impl CollectionFactoryImpl of ICollectionFactory<ContractState> {
        fn create_collection(ref self: ContractState) -> ContractAddress {
            let caller = get_caller_address();
            let collection_address = contract_address_const::<
                0x1234,
            >(); // Dummy value, to be replaced

            self.collections.write(collection_address, true);
            // Map::write(self.collections, collection_address, true);

            let count = self.user_collection_count.read(caller);
            self.user_collections.write((caller, count), collection_address);
            self.user_collection_count.write(caller, count + 1);

            self
                .emit(
                    Event::CollectionCreated(
                        CollectionCreated { creator: caller, collection: collection_address },
                    ),
                );

            collection_address
        }

        fn get_user_collections(
            self: @ContractState, user: ContractAddress,
        ) -> Array<ContractAddress> {
            let count = self.user_collection_count.read(user);
            let mut result = ArrayTrait::new();

            let mut i = 0;
            while i < count {
                let collection = self.user_collections.read((user, i));
                result.append(collection);
                i += 1;
            };

            result
        }
    }
}
