use core::array::ArrayTrait;
use core::byte_array::ByteArray;
use core::result::ResultTrait;
use nftopia::nft_contract::{INftContractDispatcher, INftContractDispatcherTrait};
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address,
    stop_cheat_caller_address,
};
#[feature("deprecated-starknet-consts")]
use starknet::{ContractAddress, contract_address_const};

// Constants for testing
const TOKEN_ID_1: u256 = 1;
const TOKEN_ID_2: u256 = 2;
const TOKEN_ID_3: u256 = 3;
const TOKEN_ID_4: u256 = 4;
const TOKEN_ID_5: u256 = 5;

// Helper function to deploy the contract
fn deploy_contract(name: ByteArray) -> ContractAddress {
    let contract = declare(name).unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@ArrayTrait::new()).unwrap();
    contract_address
}

// Helper function to create a test URI
fn create_test_uri() -> ByteArray {
    "ipfs://QmTest123456789"
}

fn create_test_uri2() -> ByteArray {
    "ipfs://QmTest1234567890"
}

fn create_test_uri3() -> ByteArray {
    "ipfs://QmTest1234567891"
}

fn create_test_uri4() -> ByteArray {
    "ipfs://QmTest1234567892"
}

#[test]
fn test_batch_mint_multiple_recipients() {
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };

    let recipient1 = contract_address_const::<0x123>();
    let recipient2 = contract_address_const::<0x456>();
    let recipient3 = contract_address_const::<0x789>();

    let mut recipients = ArrayTrait::new();
    recipients.append(recipient1);
    recipients.append(recipient2);
    recipients.append(recipient3);

    let mut token_ids = ArrayTrait::new();
    token_ids.append(TOKEN_ID_1);
    token_ids.append(TOKEN_ID_2);
    token_ids.append(TOKEN_ID_3);

    let mut uris = ArrayTrait::new();
    uris.append(create_test_uri());
    uris.append(create_test_uri2());
    uris.append(create_test_uri3());

    // Batch mint
    dispatcher.batch_mint(recipients.span(), token_ids.span(), uris.span());

    // Verify ownership
    assert(dispatcher.owner_of(TOKEN_ID_1) == recipient1, 'Wrong owner token 1');
    assert(dispatcher.owner_of(TOKEN_ID_2) == recipient2, 'Wrong owner token 2');
    assert(dispatcher.owner_of(TOKEN_ID_3) == recipient3, 'Wrong owner token 3');

    // Verify URIs
    assert(dispatcher.token_uri(TOKEN_ID_1) == create_test_uri(), 'Wrong URI token 1');
    assert(dispatcher.token_uri(TOKEN_ID_2) == create_test_uri2(), 'Wrong URI token 2');
    assert(dispatcher.token_uri(TOKEN_ID_3) == create_test_uri3(), 'Wrong URI token 3');
}

#[test]
fn test_batch_mint_to_single_recipient() {
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };

    let recipient = contract_address_const::<0x123>();

    let mut token_ids = ArrayTrait::new();
    token_ids.append(TOKEN_ID_1);
    token_ids.append(TOKEN_ID_2);
    token_ids.append(TOKEN_ID_3);

    let mut uris = ArrayTrait::new();
    uris.append(create_test_uri());
    uris.append(create_test_uri2());
    uris.append(create_test_uri3());

    // Batch mint to single recipient
    dispatcher.batch_mint_to_single_recipient(recipient, token_ids.span(), uris.span());

    // Verify all tokens belong to the same recipient
    assert(dispatcher.owner_of(TOKEN_ID_1) == recipient, 'Wrong owner token 1');
    assert(dispatcher.owner_of(TOKEN_ID_2) == recipient, 'Wrong owner token 2');
    assert(dispatcher.owner_of(TOKEN_ID_3) == recipient, 'Wrong owner token 3');

    // Verify URIs
    assert(dispatcher.token_uri(TOKEN_ID_1) == create_test_uri(), 'Wrong URI token 1');
    assert(dispatcher.token_uri(TOKEN_ID_2) == create_test_uri2(), 'Wrong URI token 2');
    assert(dispatcher.token_uri(TOKEN_ID_3) == create_test_uri3(), 'Wrong URI token 3');
}

#[test]
#[should_panic(expected: 'Array lengths mismatch')]
fn test_batch_mint_array_length_mismatch() {
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };

    let recipient1 = contract_address_const::<0x123>();
    let recipient2 = contract_address_const::<0x456>();

    let mut recipients = ArrayTrait::new();
    recipients.append(recipient1);
    recipients.append(recipient2);

    let mut token_ids = ArrayTrait::new();
    token_ids.append(TOKEN_ID_1);
    // Missing second token_id - should cause mismatch

    let mut uris = ArrayTrait::new();
    uris.append(create_test_uri());
    uris.append(create_test_uri2());

    // This should panic
    dispatcher.batch_mint(recipients.span(), token_ids.span(), uris.span());
}

#[test]
#[should_panic(expected: 'Token already exists')]
fn test_batch_mint_duplicate_token_ids() {
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };

    let recipient = contract_address_const::<0x123>();

    // First, mint a token normally
    dispatcher.mint(recipient, TOKEN_ID_1, create_test_uri());

    let mut recipients = ArrayTrait::new();
    recipients.append(recipient);

    let mut token_ids = ArrayTrait::new();
    token_ids.append(TOKEN_ID_1); // Duplicate token ID

    let mut uris = ArrayTrait::new();
    uris.append(create_test_uri2());

    // This should panic
    dispatcher.batch_mint(recipients.span(), token_ids.span(), uris.span());
}

#[test]
fn test_mint() {
    // Deploy the contract
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };

    // Create test data
    let owner = contract_address_const::<0x123>();
    let uri = create_test_uri();

    // Clone URI for later comparison
    let uri_for_comparison = uri.clone();

    // Mint a token as owner
    dispatcher.mint(owner, TOKEN_ID_1, uri);

    // Verify token ownership
    let token_owner = dispatcher.owner_of(TOKEN_ID_1);
    assert(token_owner == owner, 'Wrong token owner');

    // Verify token URI
    let token_uri = dispatcher.token_uri(TOKEN_ID_1);
    assert(token_uri == uri_for_comparison, 'Wrong token URI');

    // Verify token exists
    let exists = dispatcher.exists(TOKEN_ID_1);
    assert(exists, 'Token should exist');

    // Verify balance
    let balance = dispatcher.balance_of(owner);
    assert(balance == 1, 'Wrong balance');
}

#[test]
#[should_panic(expected: 'Token already exists')]
fn test_mint_duplicate_token() {
    // Deploy the contract
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };

    // Create test data
    let owner = contract_address_const::<0x123>();
    let uri = create_test_uri();

    // Mint a token
    dispatcher.mint(owner, TOKEN_ID_1, uri.clone());

    // Try to mint the same token again (should fail)
    dispatcher.mint(owner, TOKEN_ID_1, uri);
}

#[test]
#[should_panic(expected: 'Mint to zero address')]
fn test_mint_to_zero_address() {
    // Deploy the contract
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };

    // Create test data
    let zero_address = contract_address_const::<0x0>();
    // let owner = contract_address_const::<0x123>();
    let uri = create_test_uri();

    // Try to mint to zero address (should fail)
    dispatcher.mint(zero_address, TOKEN_ID_1, uri);
}

#[test]
fn test_transfer_from() {
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };
    let owner = contract_address_const::<0x123>();
    let recipient = contract_address_const::<0x456>();

    // Mint as owner
    start_cheat_caller_address(contract_address, owner);
    dispatcher.mint(owner, TOKEN_ID_1, create_test_uri());
    stop_cheat_caller_address(owner);

    // Transfer as owner
    start_cheat_caller_address(contract_address, owner);
    dispatcher.transfer_from(owner, recipient, TOKEN_ID_1);
    stop_cheat_caller_address(owner);

    let token_owner = dispatcher.owner_of(TOKEN_ID_1);
    assert(token_owner == recipient, 'Transfer failed');

    let owner_balance = dispatcher.balance_of(owner);
    let recipient_balance = dispatcher.balance_of(recipient);
    assert(owner_balance == 0, 'Owner balance wrong');
    assert(recipient_balance == 1, 'Recipient balance wrong');
}

#[test]
fn test_approve() {
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };
    let owner = contract_address_const::<0x123>();
    let approved = contract_address_const::<0x456>();
    let recipient = contract_address_const::<0x789>();

    // Mint as owner
    start_cheat_caller_address(contract_address, owner);
    dispatcher.mint(owner, TOKEN_ID_1, create_test_uri());
    stop_cheat_caller_address(owner);

    // Approve as owner
    start_cheat_caller_address(contract_address, owner);
    dispatcher.approve(approved, TOKEN_ID_1);
    stop_cheat_caller_address(owner);

    let approved_address = dispatcher.get_approved(TOKEN_ID_1);
    assert(approved_address == approved, 'Approval failed');

    // Transfer as approved
    start_cheat_caller_address(contract_address, approved);
    dispatcher.transfer_from(owner, recipient, TOKEN_ID_1);
    stop_cheat_caller_address(approved);

    let token_owner = dispatcher.owner_of(TOKEN_ID_1);
    assert(token_owner == recipient, 'Transfer by approved failed');
}

#[test]
fn test_set_approval_for_all() {
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };
    let owner = contract_address_const::<0x123>();
    let operator = contract_address_const::<0x456>();
    let recipient = contract_address_const::<0x789>();
    let uri = create_test_uri();

    // Mint two tokens as owner
    start_cheat_caller_address(contract_address, owner);
    dispatcher.mint(owner, TOKEN_ID_1, uri.clone());
    dispatcher.mint(owner, TOKEN_ID_2, uri.clone());
    stop_cheat_caller_address(owner);

    // Set approval for all as owner
    start_cheat_caller_address(contract_address, owner);
    dispatcher.set_approval_for_all(operator, true);
    stop_cheat_caller_address(owner);

    let is_approved = dispatcher.is_approved_for_all(owner, operator);
    assert(is_approved, 'Approval for all failed');

    // Transfers as operator
    start_cheat_caller_address(contract_address, operator);
    dispatcher.transfer_from(owner, recipient, TOKEN_ID_1);
    dispatcher.transfer_from(owner, recipient, TOKEN_ID_2);
    stop_cheat_caller_address(operator);

    let token1_owner = dispatcher.owner_of(TOKEN_ID_1);
    let token2_owner = dispatcher.owner_of(TOKEN_ID_2);
    assert(token1_owner == recipient, 'Transfer 1 by operator failed');
    assert(token2_owner == recipient, 'Transfer 2 by operator failed');

    let owner_balance = dispatcher.balance_of(owner);
    let recipient_balance = dispatcher.balance_of(recipient);
    assert(owner_balance == 0, 'Owner balance wrong');
    assert(recipient_balance == 2, 'Recipient balance wrong');
}

#[test]
#[should_panic(expected: 'Self approval')]
fn test_self_approval_for_all() {
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };
    let owner = contract_address_const::<0x123>();

    start_cheat_caller_address(contract_address, owner);
    dispatcher.set_approval_for_all(owner, true);
    stop_cheat_caller_address(owner);
}

#[test]
fn test_revoke_approval() {
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };
    let owner = contract_address_const::<0x123>();
    let approved = contract_address_const::<0x456>();

    // Mint as owner
    start_cheat_caller_address(contract_address, owner);
    dispatcher.mint(owner, TOKEN_ID_1, create_test_uri());
    stop_cheat_caller_address(owner);

    // Approve as owner
    start_cheat_caller_address(contract_address, owner);
    dispatcher.approve(approved, TOKEN_ID_1);
    stop_cheat_caller_address(owner);

    let approved_address = dispatcher.get_approved(TOKEN_ID_1);
    assert(approved_address == approved, 'Approval failed');

    // Revoke as owner
    start_cheat_caller_address(contract_address, owner);
    dispatcher.approve(contract_address_const::<0x1>(), TOKEN_ID_1);
    stop_cheat_caller_address(owner);

    let revoked = dispatcher.get_approved(TOKEN_ID_1);
    assert(revoked == contract_address_const::<0x1>(), 'Revocation failed');
}

#[test]
fn test_revoke_approval_for_all() {
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };
    let owner = contract_address_const::<0x123>();
    let operator = contract_address_const::<0x456>();

    // Grant as owner
    start_cheat_caller_address(contract_address, owner);
    dispatcher.set_approval_for_all(operator, true);
    stop_cheat_caller_address(owner);

    let is_approved = dispatcher.is_approved_for_all(owner, operator);
    assert(is_approved, 'Approval for all failed');

    // Revoke as owner
    start_cheat_caller_address(contract_address, owner);
    dispatcher.set_approval_for_all(operator, false);
    stop_cheat_caller_address(owner);

    let is_revoked = dispatcher.is_approved_for_all(owner, operator);
    assert(!is_revoked, 'Revocation failed');
}


#[test]
#[should_panic(expected: 'Token does not exist')]
fn test_get_nonexistent_token() {
    // Deploy the contract
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };

    // Try to get owner of nonexistent token (should fail)
    dispatcher.owner_of(TOKEN_ID_1);
}
