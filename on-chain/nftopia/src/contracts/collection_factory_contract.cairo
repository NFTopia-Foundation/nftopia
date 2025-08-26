use starknet::ContractAddress;

#[starknet::interface]
pub trait ICollectionFactory<TContractState> {
    // Collection management
    fn create_collection(ref self: TContractState) -> ContractAddress;
    fn get_user_collections(self: @TContractState, user: ContractAddress) -> Array<ContractAddress>;
    
    // NFT management
    fn add_nft_to_collection(
        ref self: TContractState,
        collection: ContractAddress,
        user: ContractAddress,
        token_id: u256
    );
    fn add_nfts_to_collection(
        ref self: TContractState,
        collection: ContractAddress,
        user: ContractAddress,
        token_ids: Span<u256>
    );
    fn has_nft(
        self: @TContractState,
        user: ContractAddress,
        collection: ContractAddress,
        token_id: u256
    ) -> bool;
}



#[starknet::contract]
pub mod CollectionFactory {

    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::contract_address::contract_address_const;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};
    use core::array::{Array, ArrayTrait, SpanTrait};
    use core::traits::Into;



    #[storage]
    pub struct Storage {
        collections: Map<ContractAddress, bool>,
        user_collections: Map<(ContractAddress, u32), ContractAddress>,
        user_collection_count: Map<ContractAddress, u32>,
        collection_nfts: Map<(ContractAddress, u256), bool>, // (collection, token_id) => exists
        user_nfts: Map<(ContractAddress, ContractAddress, u256), bool> // (user, collection, token_id) => exists
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        CollectionCreated: CollectionCreated,
        NftAdded: NftAdded,
        NftsBatchAdded: NftsBatchAdded
    }

    #[derive(Drop, starknet::Event)]
    pub struct CollectionCreated {
        creator: ContractAddress,
        collection: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct NftAdded {
        collection: ContractAddress,
        user: ContractAddress,
        token_id: u256,
        added_by: ContractAddress
    }

    #[derive(Drop, starknet::Event)]
    pub struct NftsBatchAdded {
        collection: ContractAddress,
        user: ContractAddress,
        token_ids: Span<u256>,
        added_by: ContractAddress
    }

    #[abi(embed_v0)]
    pub impl CollectionFactoryImpl of super::ICollectionFactory<ContractState> {
        fn create_collection(ref self: ContractState) -> ContractAddress {
            let caller = get_caller_address();
            let collection_address = contract_address_const::<0x1234>(); // Should be replaced with actual deployment

            self.collections.write(collection_address, true);

            let count = self.user_collection_count.read(caller);
            self.user_collections.write((caller, count), collection_address);
            self.user_collection_count.write(caller, count + 1);

            self.emit(CollectionCreated { creator: caller, collection: collection_address });
            collection_address
        }

        fn get_user_collections(
            self: @ContractState,
            user: ContractAddress
        ) -> Array<ContractAddress> {
            let count = self.user_collection_count.read(user);
            let mut result = ArrayTrait::new();

            let mut i = 0;
            while i < count {
                result.append(self.user_collections.read((user, i)));
                i += 1;
            };
            result
        }

        fn add_nft_to_collection(
            ref self: ContractState,
            collection: ContractAddress,
            user: ContractAddress,
            token_id: u256
        ) {
            self._validate_collection_access(collection);
            
            self.collection_nfts.write((collection, token_id), true);
            self.user_nfts.write((user, collection, token_id), true);

            self.emit(NftAdded {
                collection,
                user,
                token_id,
                added_by: get_caller_address()
            });
        }

        fn add_nfts_to_collection(
            ref self: ContractState,
            collection: ContractAddress,
            user: ContractAddress,
            token_ids: Span<u256>
        ) {
            self._validate_collection_access(collection);
            let caller = get_caller_address();

            let mut i = 0;
            while i < token_ids.len() {
                let token_id = *token_ids.at(i);
                self.collection_nfts.write((collection, token_id), true);
                self.user_nfts.write((user, collection, token_id), true);
                i += 1;
            };

            self.emit(NftsBatchAdded {
                collection,
                user,
                token_ids,
                added_by: caller
            });
        }

        fn has_nft(
            self: @ContractState,
            user: ContractAddress,
            collection: ContractAddress,
            token_id: u256
        ) -> bool {
            self.user_nfts.read((user, collection, token_id))
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _validate_collection_access(
            self: @ContractState,
            collection: ContractAddress
        ) {
            assert!(self.collections.read(collection), "Invalid collection");
            assert!(get_caller_address() == self._get_collection_owner(collection), "Only collection owner can add NFTs");
        }

        fn _get_collection_owner(
            self: @ContractState,
            collection: ContractAddress
        ) -> ContractAddress {
            let caller = get_caller_address();
            return caller;
        }
    }
}