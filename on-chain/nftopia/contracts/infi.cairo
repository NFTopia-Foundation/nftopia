#[starknet::contract]
mod Infi {
    use starknet::ContractAddress;
    use starknet::get_caller_address;
    use starknet::get_contract_address;

    #[starknet::storage]
    struct Storage {
        token_owner: LegacyMap<u256, ContractAddress>,
        token_uri: LegacyMap<u256, felt252>,
        token_collection: LegacyMap<u256, ContractAddress>
    }

    #[starknet::event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        TokenMinted: TokenMinted,
        TokenTransferred: TokenTransferred,
        CollectionUpdated: CollectionUpdated
    }

    #[derive(Drop, starknet::Event)]
    struct TokenMinted {
        token_id: u256,
        owner: ContractAddress,
        uri: felt252,
        creator: ContractAddress
    }

    #[derive(Drop, starknet::Event)]
    struct TokenTransferred {
        token_id: u256,
        from: ContractAddress,
        to: ContractAddress
    }

    #[derive(Drop, starknet::Event)]
    struct CollectionUpdated {
        token_id: u256,
        old_collection: ContractAddress,
        new_collection: ContractAddress
    }

    #[starknet::external]
    fn mint(ref self: ContractState, recipient: ContractAddress, token_id: u256, uri: felt252, creator: ContractAddress) {
        // Check if token_id is already minted
        let current_owner = self.token_owner.read(token_id);
        assert(current_owner == ContractAddress::default(), 'Token already minted');

        // Set token owner
        self.token_owner.write(token_id, recipient);

        // Set token URI
        self.token_uri.write(token_id, uri);

        // Emit token_minted event
        self.emit(TokenMinted { token_id, owner: recipient, uri, creator });
    }

    #[starknet::external]
    fn transfer(ref self: ContractState, from: ContractAddress, to: ContractAddress, token_id: u256) {
        // Check if sender is the owner
        let current_owner = self.token_owner.read(token_id);
        assert(current_owner == from, 'Not the owner');

        // Update token owner
        self.token_owner.write(token_id, to);

        // Emit token_transferred event
        self.emit(TokenTransferred { token_id, from, to });
    }

    #[starknet::view]
    fn owner_of(self: @ContractState, token_id: u256) -> ContractAddress {
        self.token_owner.read(token_id)
    }

    #[starknet::view]
    fn token_uri(self: @ContractState, token_id: u256) -> felt252 {
        self.token_uri.read(token_id)
    }

    #[starknet::view]
    fn get_collection(self: @ContractState, token_id: u256) -> ContractAddress {
        self.token_collection.read(token_id)
    }

    #[starknet::external]
    fn set_collection(ref self: ContractState, token_id: u256, collection: ContractAddress) {
        // Check if sender is the owner
        let current_owner = self.token_owner.read(token_id);
        assert(current_owner == get_caller_address(), 'Not the owner');

        let old_collection = self.token_collection.read(token_id);
        self.token_collection.write(token_id, collection);

        // Emit collection_updated event
        self.emit(CollectionUpdated { token_id, old_collection, new_collection: collection });
    }
} 