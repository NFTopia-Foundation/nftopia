#[feature("deprecated-starknet-consts")]
use starknet::{ContractAddress, contract_address_const};
use core::array::ArrayTrait;
use core::result::ResultTrait;
use core::byte_array::ByteArray;
use snforge_std::{ContractClassTrait, DeclareResultTrait, start_prank, stop_prank, CheatTarget};

use snforge_std::declare;

use nftopia::modules::nft_contract::{INftContractDispatcher, INftContractDispatcherTrait};

// Constants for testing
const TOKEN_ID_1: u256 = 1;
const TOKEN_ID_2: u256 = 2;

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

#[test]
fn test_mint() {
    // Deploy the contract
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };
    
    // Create test data
    let owner = contract_address_const::<0x123>();
    let uri = create_test_uri();
    
    // Mint a token as owner
    start_prank(CheatTarget::One(contract_address), owner);
    dispatcher.mint(owner, TOKEN_ID_1, uri);
    stop_prank(CheatTarget::One(contract_address));
    
    // Verify token ownership
    let token_owner = dispatcher.owner_of(TOKEN_ID_1);
    assert(token_owner == owner, 'Wrong token owner');
    
    // Verify token URI
    let token_uri = dispatcher.token_uri(TOKEN_ID_1);
    assert(token_uri == uri, 'Wrong token URI');
    
    // Verify token exists
    let exists = dispatcher.exists(TOKEN_ID_1);
    assert(exists, 'Token should exist');
    
    // Verify balance
    let balance = dispatcher.balance_of(owner);
    assert(balance == 1, 'Wrong balance');
}

#[test]
#[should_panic(expected: ('Token already exists', ))]
fn test_mint_duplicate_token() {
    // Deploy the contract
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };
    
    // Create test data
    let owner = contract_address_const::<0x123>();
    let uri = create_test_uri();
    
    // Mint a token
    start_prank(CheatTarget::One(contract_address), owner);
    dispatcher.mint(owner, TOKEN_ID_1, uri);
    
    // Try to mint the same token again (should fail)
    dispatcher.mint(owner, TOKEN_ID_1, uri);
    stop_prank(CheatTarget::One(contract_address));
}

#[test]
#[should_panic(expected: ('Mint to zero address', ))]
fn test_mint_to_zero_address() {
    // Deploy the contract
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };
    
    // Create test data
    let zero_address = contract_address_const::<0x0>();
    let owner = contract_address_const::<0x123>();
    let uri = create_test_uri();
    
    // Try to mint to zero address (should fail)
    start_prank(CheatTarget::One(contract_address), owner);
    dispatcher.mint(zero_address, TOKEN_ID_1, uri);
    stop_prank(CheatTarget::One(contract_address));
}

#[test]
fn test_transfer_from() {
    // Deploy the contract
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };
    
    // Create test data
    let owner = contract_address_const::<0x123>();
    let recipient = contract_address_const::<0x456>();
    let uri = create_test_uri();
    
    // Mint a token as owner
    start_prank(CheatTarget::One(contract_address), owner);
    dispatcher.mint(owner, TOKEN_ID_1, uri);
    
    // Transfer the token to recipient
    dispatcher.transfer_from(owner, recipient, TOKEN_ID_1);
    stop_prank(CheatTarget::One(contract_address));
    
    // Verify token ownership changed
    let token_owner = dispatcher.owner_of(TOKEN_ID_1);
    assert(token_owner == recipient, 'Transfer failed');
    
    // Verify balances updated
    let owner_balance = dispatcher.balance_of(owner);
    let recipient_balance = dispatcher.balance_of(recipient);
    assert(owner_balance == 0, 'Owner balance wrong');
    assert(recipient_balance == 1, 'Recipient balance wrong');
}

#[test]
#[should_panic(expected: ('Caller not authorized', ))]
fn test_unauthorized_transfer() {
    // Deploy the contract
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };
    
    // Create test data
    let owner = contract_address_const::<0x123>();
    let recipient = contract_address_const::<0x456>();
    let attacker = contract_address_const::<0x789>();
    let uri = create_test_uri();
    
    // Mint a token as owner
    start_prank(CheatTarget::One(contract_address), owner);
    dispatcher.mint(owner, TOKEN_ID_1, uri);
    stop_prank(CheatTarget::One(contract_address));
    
    // Try to transfer as unauthorized user (should fail)
    start_prank(CheatTarget::One(contract_address), attacker);
    dispatcher.transfer_from(owner, recipient, TOKEN_ID_1);
    stop_prank(CheatTarget::One(contract_address));
}

#[test]
fn test_approve() {
    // Deploy the contract
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };
    
    // Create test data
    let owner = contract_address_const::<0x123>();
    let approved = contract_address_const::<0x456>();
    let recipient = contract_address_const::<0x789>();
    let uri = create_test_uri();
    
    // Mint a token as owner
    start_prank(CheatTarget::One(contract_address), owner);
    dispatcher.mint(owner, TOKEN_ID_1, uri);
    
    // Approve another address
    dispatcher.approve(approved, TOKEN_ID_1);
    stop_prank(CheatTarget::One(contract_address));
    
    // Verify approval
    let approved_address = dispatcher.get_approved(TOKEN_ID_1);
    assert(approved_address == approved, 'Approval failed');
    
    // Transfer by approved address
    start_prank(CheatTarget::One(contract_address), approved);
    dispatcher.transfer_from(owner, recipient, TOKEN_ID_1);
    stop_prank(CheatTarget::One(contract_address));
    
    // Verify transfer worked
    let token_owner = dispatcher.owner_of(TOKEN_ID_1);
    assert(token_owner == recipient, 'Transfer by approved failed');
}

#[test]
#[should_panic(expected: ('Caller not authorized', ))]
fn test_unauthorized_approval() {
    // Deploy the contract
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };
    
    // Create test data
    let owner = contract_address_const::<0x123>();
    let approved = contract_address_const::<0x456>();
    let attacker = contract_address_const::<0x789>();
    let uri = create_test_uri();
    
    // Mint a token as owner
    start_prank(CheatTarget::One(contract_address), owner);
    dispatcher.mint(owner, TOKEN_ID_1, uri);
    stop_prank(CheatTarget::One(contract_address));
    
    // Try to approve as unauthorized user (should fail)
    start_prank(CheatTarget::One(contract_address), attacker);
    dispatcher.approve(approved, TOKEN_ID_1);
    stop_prank(CheatTarget::One(contract_address));
}

#[test]
fn test_set_approval_for_all() {
    // Deploy the contract
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };
    
    // Create test data
    let owner = contract_address_const::<0x123>();
    let operator = contract_address_const::<0x456>();
    let recipient = contract_address_const::<0x789>();
    let uri = create_test_uri();
    
    // Mint two tokens as owner
    start_prank(CheatTarget::One(contract_address), owner);
    dispatcher.mint(owner, TOKEN_ID_1, uri);
    dispatcher.mint(owner, TOKEN_ID_2, uri);
    
    // Set approval for all
    dispatcher.set_approval_for_all(operator, true);
    stop_prank(CheatTarget::One(contract_address));
    
    // Verify approval for all
    let is_approved = dispatcher.is_approved_for_all(owner, operator);
    assert(is_approved, 'Approval for all failed');
    
    // Transfer both tokens by operator
    start_prank(CheatTarget::One(contract_address), operator);
    dispatcher.transfer_from(owner, recipient, TOKEN_ID_1);
    dispatcher.transfer_from(owner, recipient, TOKEN_ID_2);
    stop_prank(CheatTarget::One(contract_address));
    
    // Verify transfers worked
    let token1_owner = dispatcher.owner_of(TOKEN_ID_1);
    let token2_owner = dispatcher.owner_of(TOKEN_ID_2);
    assert(token1_owner == recipient, 'Transfer 1 by operator failed');
    assert(token2_owner == recipient, 'Transfer 2 by operator failed');
    
    // Verify balances updated
    let owner_balance = dispatcher.balance_of(owner);
    let recipient_balance = dispatcher.balance_of(recipient);
    assert(owner_balance == 0, 'Owner balance wrong');
    assert(recipient_balance == 2, 'Recipient balance wrong');
}

#[test]
#[should_panic(expected: ('Self approval', ))]
fn test_self_approval_for_all() {
    // Deploy the contract
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };
    
    // Create test data
    let owner = contract_address_const::<0x123>();
    
    // Try to approve self (should fail)
    start_prank(CheatTarget::One(contract_address), owner);
    dispatcher.set_approval_for_all(owner, true);
    stop_prank(CheatTarget::One(contract_address));
}

#[test]
#[should_panic(expected: ('Token does not exist', ))]
fn test_get_nonexistent_token() {
    // Deploy the contract
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };
    
    // Try to get owner of nonexistent token (should fail)
    dispatcher.owner_of(TOKEN_ID_1);
}

#[test]
fn test_revoke_approval() {
    // Deploy the contract
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };
    
    // Create test data
    let owner = contract_address_const::<0x123>();
    let approved = contract_address_const::<0x456>();
    let uri = create_test_uri();
    
    // Mint a token as owner
    start_prank(CheatTarget::One(contract_address), owner);
    dispatcher.mint(owner, TOKEN_ID_1, uri);
    
    // Approve another address
    dispatcher.approve(approved, TOKEN_ID_1);
    
    // Verify approval
    let approved_address = dispatcher.get_approved(TOKEN_ID_1);
    assert(approved_address == approved, 'Approval failed');
    
    // Revoke approval by setting to zero address
    dispatcher.approve(contract_address_const::<0x0>(), TOKEN_ID_1);
    stop_prank(CheatTarget::One(contract_address));
    
    // Verify approval revoked
    let approved_address = dispatcher.get_approved(TOKEN_ID_1);
    assert(approved_address == contract_address_const::<0x0>(), 'Revocation failed');
}

#[test]
fn test_revoke_approval_for_all() {
    // Deploy the contract
    let contract_address = deploy_contract("NftContract");
    let dispatcher = INftContractDispatcher { contract_address };
    
    // Create test data
    let owner = contract_address_const::<0x123>();
    let operator = contract_address_const::<0x456>();
    
    // Set approval for all
    start_prank(CheatTarget::One(contract_address), owner);
    dispatcher.set_approval_for_all(operator, true);
    
    // Verify approval for all
    let is_approved = dispatcher.is_approved_for_all(owner, operator);
    assert(is_approved, 'Approval for all failed');
    
    // Revoke approval for all
    dispatcher.set_approval_for_all(operator, false);
    stop_prank(CheatTarget::One(contract_address));
    
    // Verify approval for all revoked
    let is_approved = dispatcher.is_approved_for_all(owner, operator);
    assert(!is_approved, 'Revocation failed');
}
