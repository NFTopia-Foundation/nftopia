%lang starknet

// Storage for token ownership mapping (token_id -> owner)
@storage_var
func token_owner(token_id: u256) -> (owner: felt) {
}

// Storage for token metadata URIs (token_id -> ByteArray)
@storage_var
func token_uri(token_id: u256) -> (uri: felt) {
}

// Storage for token collections (token_id -> ContractAddress)
@storage_var
func token_collection(token_id: u256) -> (collection: felt) {
}

// Event for token minting
@event
func token_minted(token_id: u256, owner: felt, uri: felt, creator: felt) {
}

// Event for token transfer
@event
func token_transferred(token_id: u256, from: felt, to: felt) {
}

// Event for collection update
@event
func collection_updated(token_id: u256, old_collection: felt, new_collection: felt) {
}

// Function to mint a new token
@external
func mint(recipient: felt, token_id: u256, uri: felt, creator: felt) {
    // Check if token_id is already minted
    let (current_owner) = token_owner.read(token_id);
    assert current_owner = 0, "Token already minted";

    // Set token owner
    token_owner.write(token_id, recipient);

    // Set token URI
    token_uri.write(token_id, uri);

    // Emit token_minted event
    token_minted.emit(token_id, recipient, uri, creator);
}

// Function to transfer a token
@external
func transfer(from: felt, to: felt, token_id: u256) {
    // Check if sender is the owner
    let (current_owner) = token_owner.read(token_id);
    assert current_owner = from, "Not the owner";

    // Update token owner
    token_owner.write(token_id, to);

    // Emit token_transferred event
    token_transferred.emit(token_id, from, to);
}

// Function to get the owner of a token
@view
func owner_of(token_id: u256) -> (owner: felt) {
    let (owner) = token_owner.read(token_id);
    return (owner,);
}

// Function to get the URI of a token
@view
func token_uri(token_id: u256) -> (uri: felt) {
    let (uri) = token_uri.read(token_id);
    return (uri,);
}

// Function to get the collection of a token
@view
func get_collection(token_id: u256) -> (collection: felt) {
    let (collection) = token_collection.read(token_id);
    return (collection,);
}

// Function to set the collection of a token
@external
func set_collection(token_id: u256, collection: felt) {
    // Check if sender is the owner
    let (current_owner) = token_owner.read(token_id);
    assert current_owner = get_caller_address(), "Not the owner";

    let (old_collection) = token_collection.read(token_id);
    token_collection.write(token_id, collection);

    // Emit collection_updated event
    collection_updated.emit(token_id, old_collection, collection);
} 