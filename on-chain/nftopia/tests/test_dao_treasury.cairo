use starknet::contract_address_const;
use snforge_std::{
    declare, DeclareResultTrait, ContractClassTrait, start_cheat_caller_address, stop_cheat_caller_address,
    start_cheat_block_timestamp, stop_cheat_block_timestamp
};

use nftopia::contracts::dao_treasury::{
    IDaoTreasuryDispatcher, IDaoTreasuryDispatcherTrait
};

// Test constants
const ADMIN: felt252 = 'admin';
const SIGNER1: felt252 = 'signer1';
const SIGNER2: felt252 = 'signer2';
const SIGNER3: felt252 = 'signer3';
const BENEFICIARY: felt252 = 'beneficiary';

fn deploy_treasury() -> IDaoTreasuryDispatcher {
    let admin_address = contract_address_const::<ADMIN>();
    let signer1_address = contract_address_const::<SIGNER1>();
    let signer2_address = contract_address_const::<SIGNER2>();
    let signer3_address = contract_address_const::<SIGNER3>();
    
    let signers = array![signer1_address, signer2_address, signer3_address];
    let required_approvals = 2_u32;
    let withdrawal_limit = 1000000000000000000000_u256; // 1000 units

    let treasury_class = declare("DaoTreasury").unwrap().contract_class();
    let calldata = array![
        admin_address.into(),
        signers.len().into(),
        signer1_address.into(),
        signer2_address.into(), 
        signer3_address.into(),
        required_approvals.into(),
        withdrawal_limit.low.into(),
        withdrawal_limit.high.into()
    ];
    
    let (treasury_address, _) = treasury_class.deploy(@calldata).unwrap();
        IDaoTreasuryDispatcher { contract_address: treasury_address }
}

fn setup_treasury_with_funds() -> IDaoTreasuryDispatcher {
    let treasury = deploy_treasury();
    let admin_address = contract_address_const::<ADMIN>();
    
    // Deposit funds
    start_cheat_caller_address(treasury.contract_address, admin_address);
    treasury.deposit(5000000000000000000000_u256); // 5000 units
    stop_cheat_caller_address(treasury.contract_address);
    
    treasury
}

#[test]
fn test_treasury_deployment() {
    let treasury = deploy_treasury();
    
    assert(treasury.get_balance() == 0, 'Initial balance should be 0');
    assert(treasury.get_required_approvals() == 2, 'Wrong required approvals');
    assert(treasury.get_withdrawal_limit() == 1000000000000000000000, 'Wrong withdrawal limit');
    assert(treasury.get_request_count() == 0, 'Wrong initial request count');
    
    // Check if signers are authorized
    let signer1_address = contract_address_const::<SIGNER1>();
    let signer2_address = contract_address_const::<SIGNER2>();
    let signer3_address = contract_address_const::<SIGNER3>();
    
    assert(treasury.is_authorized_signer(signer1_address), 'Signer1 not authorized');
    assert(treasury.is_authorized_signer(signer2_address), 'Signer2 not authorized');
    assert(treasury.is_authorized_signer(signer3_address), 'Signer3 not authorized');
}

#[test]
fn test_deposit() {
    let treasury = deploy_treasury();
    let admin_address = contract_address_const::<ADMIN>();
    
    start_cheat_caller_address(treasury.contract_address, admin_address);
    
    let deposit_amount = 1000000000000000000000_u256; // 1000 units
    treasury.deposit(deposit_amount);
    
    assert(treasury.get_balance() == deposit_amount, 'Wrong balance after deposit');
    
    stop_cheat_caller_address(treasury.contract_address);
}

#[test]
#[should_panic(expected: "Amount must be positive")]
fn test_zero_deposit() {
    let treasury = deploy_treasury();
    let admin_address = contract_address_const::<ADMIN>();
    
    start_cheat_caller_address(treasury.contract_address, admin_address);
    treasury.deposit(0);
}

#[test]
fn test_withdrawal_request() {
    let treasury = setup_treasury_with_funds();
    let admin_address = contract_address_const::<ADMIN>();
    let beneficiary_address = contract_address_const::<BENEFICIARY>();
    
    start_cheat_caller_address(treasury.contract_address, admin_address);
    start_cheat_block_timestamp(treasury.contract_address, 1000);
    
    let withdrawal_amount = 500000000000000000000_u256; // 500 units
    let description_hash = 'test_withdrawal';
    
    let request_id = treasury.request_withdrawal(
        beneficiary_address,
        withdrawal_amount,
        description_hash
    );
    
    // Check request was created
    let request = treasury.get_withdrawal_request(request_id);
    assert(request.id == request_id, 'Wrong request ID');
    assert(request.beneficiary == beneficiary_address, 'Wrong beneficiary');
    assert(request.amount == withdrawal_amount, 'Wrong amount');
    assert(request.description_hash == description_hash, 'Wrong description hash');
    assert(request.created_at == 1000, 'Wrong creation time');
    assert(request.approved_count == 0, 'Wrong initial approved count');
    assert(!request.executed, 'Should not be executed');
    assert(!request.cancelled, 'Should not be cancelled');
    
    // Check request count
    assert(treasury.get_request_count() == 1, 'Wrong request count');
    
    stop_cheat_block_timestamp(treasury.contract_address);
    stop_cheat_caller_address(treasury.contract_address);
}

#[test]
#[should_panic(expected: "Exceeds withdrawal limit")]
fn test_withdrawal_exceeds_limit() {
    let treasury = setup_treasury_with_funds();
    let admin_address = contract_address_const::<ADMIN>();
    let beneficiary_address = contract_address_const::<BENEFICIARY>();
    
    start_cheat_caller_address(treasury.contract_address, admin_address);
    
    let excessive_amount = 2000000000000000000000_u256; // 2000 units (exceeds 1000 limit)
    
    treasury.request_withdrawal(
        beneficiary_address,
        excessive_amount,
        'excessive_withdrawal'
    );
}

#[test]
#[should_panic(expected: "Insufficient balance")]
fn test_withdrawal_exceeds_balance() {
    let treasury = deploy_treasury();
    let admin_address = contract_address_const::<ADMIN>();
    let beneficiary_address = contract_address_const::<BENEFICIARY>();
    
    start_cheat_caller_address(treasury.contract_address, admin_address);
    
    // Try to withdraw from empty treasury
    treasury.request_withdrawal(
        beneficiary_address,
        100000000000000000000_u256,
        'insufficient_balance'
    );
}

#[test]
fn test_withdrawal_approval_process() {
    let treasury = setup_treasury_with_funds();
    let admin_address = contract_address_const::<ADMIN>();
    let signer1_address = contract_address_const::<SIGNER1>();
    let signer2_address = contract_address_const::<SIGNER2>();
    let beneficiary_address = contract_address_const::<BENEFICIARY>();
    
    // Create withdrawal request
    start_cheat_caller_address(treasury.contract_address, admin_address);
    let request_id = treasury.request_withdrawal(
        beneficiary_address,
        500000000000000000000_u256,
        'approval_test'
    );
    stop_cheat_caller_address(treasury.contract_address);
    
    // First approval
    start_cheat_caller_address(treasury.contract_address, signer1_address);
    treasury.approve_withdrawal(request_id);
    stop_cheat_caller_address(treasury.contract_address);
    
    // Check approval
    let request = treasury.get_withdrawal_request(request_id);
    assert!(request.approved_count == 1, "Wrong approval count after first");
    assert!(treasury.has_approved(request_id, signer1_address), "Signer1 should have approved");
    assert!(!treasury.has_approved(request_id, signer2_address), "Signer2 should not have approved");
    
    // Second approval
    start_cheat_caller_address(treasury.contract_address, signer2_address);
    treasury.approve_withdrawal(request_id);
    stop_cheat_caller_address(treasury.contract_address);
    
    // Check final approval count
    let request = treasury.get_withdrawal_request(request_id);
    assert!(request.approved_count == 2, "Wrong approval count after second");
    assert(treasury.has_approved(request_id, signer2_address), 'Signer2 should have approved');
}

#[test]
#[should_panic(expected: "Already approved")]
fn test_duplicate_approval() {
    let treasury = setup_treasury_with_funds();
    let admin_address = contract_address_const::<ADMIN>();
    let signer1_address = contract_address_const::<SIGNER1>();
    let beneficiary_address = contract_address_const::<BENEFICIARY>();
    
    // Create withdrawal request
    start_cheat_caller_address(treasury.contract_address, admin_address);
    let request_id = treasury.request_withdrawal(
        beneficiary_address,
        100000000000000000000_u256,
        'duplicate_test'
    );
    stop_cheat_caller_address(treasury.contract_address);
    
    // First approval
    start_cheat_caller_address(treasury.contract_address, signer1_address);
    treasury.approve_withdrawal(request_id);
    
    // Second approval by same signer should fail
    treasury.approve_withdrawal(request_id);
}

#[test]
#[should_panic(expected: "Not authorized signer")]
fn test_unauthorized_approval() {
    let treasury = setup_treasury_with_funds();
    let admin_address = contract_address_const::<ADMIN>();
    let unauthorized_address = contract_address_const::<'unauthorized'>();
    let beneficiary_address = contract_address_const::<BENEFICIARY>();
    
    // Create withdrawal request
    start_cheat_caller_address(treasury.contract_address, admin_address);
    let request_id = treasury.request_withdrawal(
        beneficiary_address,
        100000000000000000000_u256,
        'unauthorized_test'
    );
    stop_cheat_caller_address(treasury.contract_address);
    
    // Unauthorized user tries to approve
    start_cheat_caller_address(treasury.contract_address, unauthorized_address);
    treasury.approve_withdrawal(request_id);
}

#[test]
fn test_withdrawal_execution() {
    let treasury = setup_treasury_with_funds();
    let admin_address = contract_address_const::<ADMIN>();
    let signer1_address = contract_address_const::<SIGNER1>();
    let signer2_address = contract_address_const::<SIGNER2>();
    let beneficiary_address = contract_address_const::<BENEFICIARY>();
    
    let initial_balance = treasury.get_balance();
    let withdrawal_amount = 500000000000000000000_u256;
    
    // Create and approve withdrawal request
    start_cheat_caller_address(treasury.contract_address, admin_address);
    let request_id = treasury.request_withdrawal(
        beneficiary_address,
        withdrawal_amount,
        'execution_test'
    );
    stop_cheat_caller_address(treasury.contract_address);
    
    // Get approvals
    start_cheat_caller_address(treasury.contract_address, signer1_address);
    treasury.approve_withdrawal(request_id);
    stop_cheat_caller_address(treasury.contract_address);
    
    start_cheat_caller_address(treasury.contract_address, signer2_address);
    treasury.approve_withdrawal(request_id);
    stop_cheat_caller_address(treasury.contract_address);
    
    // Execute withdrawal
    start_cheat_caller_address(treasury.contract_address, admin_address);
    treasury.execute_withdrawal(request_id);
    stop_cheat_caller_address(treasury.contract_address);
    
    // Check execution
    let request = treasury.get_withdrawal_request(request_id);
    assert(request.executed, 'Should be executed');
    assert(treasury.get_balance() == initial_balance - withdrawal_amount, 'Wrong balance after execution');
}

#[test]
#[should_panic(expected: "Insufficient approvals")]
fn test_execution_without_sufficient_approvals() {
    let treasury = setup_treasury_with_funds();
    let admin_address = contract_address_const::<ADMIN>();
    let signer1_address = contract_address_const::<SIGNER1>();
    let beneficiary_address = contract_address_const::<BENEFICIARY>();
    
    // Create withdrawal request
    start_cheat_caller_address(treasury.contract_address, admin_address);
    let request_id = treasury.request_withdrawal(
        beneficiary_address,
        100000000000000000000_u256,
        'insufficient_approvals'
    );
    stop_cheat_caller_address(treasury.contract_address);
    
    // Only one approval (need 2)
    start_cheat_caller_address(treasury.contract_address, signer1_address);
    treasury.approve_withdrawal(request_id);
    stop_cheat_caller_address(treasury.contract_address);
    
    // Try to execute with insufficient approvals
    start_cheat_caller_address(treasury.contract_address, admin_address);
    treasury.execute_withdrawal(request_id);
}

#[test]
#[should_panic(expected: "Request already executed")]
fn test_double_execution() {
    let treasury = setup_treasury_with_funds();
    let admin_address = contract_address_const::<ADMIN>();
    let signer1_address = contract_address_const::<SIGNER1>();
    let signer2_address = contract_address_const::<SIGNER2>();
    let beneficiary_address = contract_address_const::<BENEFICIARY>();
    
    // Create, approve, and execute withdrawal
    start_cheat_caller_address(treasury.contract_address, admin_address);
    let request_id = treasury.request_withdrawal(
        beneficiary_address,
        100000000000000000000_u256,
        'double_execution'
    );
    stop_cheat_caller_address(treasury.contract_address);
    
    start_cheat_caller_address(treasury.contract_address, signer1_address);
    treasury.approve_withdrawal(request_id);
    stop_cheat_caller_address(treasury.contract_address);
    
    start_cheat_caller_address(treasury.contract_address, signer2_address);
    treasury.approve_withdrawal(request_id);
    stop_cheat_caller_address(treasury.contract_address);
    
    start_cheat_caller_address(treasury.contract_address, admin_address);
    treasury.execute_withdrawal(request_id);
    
    // Try to execute again
    treasury.execute_withdrawal(request_id);
}

#[test]
fn test_withdrawal_cancellation() {
    let treasury = setup_treasury_with_funds();
    let admin_address = contract_address_const::<ADMIN>();
    let beneficiary_address = contract_address_const::<BENEFICIARY>();
    
    // Create withdrawal request
    start_cheat_caller_address(treasury.contract_address, admin_address);
    let request_id = treasury.request_withdrawal(
        beneficiary_address,
        100000000000000000000_u256,
        'cancellation_test'
    );
    
    // Cancel the request
    treasury.cancel_withdrawal(request_id);
    
    // Check cancellation
    let request = treasury.get_withdrawal_request(request_id);
    assert(request.cancelled, 'Should be cancelled');
    
    stop_cheat_caller_address(treasury.contract_address);
}

#[test]
#[should_panic(expected: "Only admin can cancel withdrawal")]
fn test_unauthorized_cancellation() {
    let treasury = setup_treasury_with_funds();
    let admin_address = contract_address_const::<ADMIN>();
    let unauthorized_address = contract_address_const::<'unauthorized'>();
    let beneficiary_address = contract_address_const::<BENEFICIARY>();
    
    // Create withdrawal request
    start_cheat_caller_address(treasury.contract_address, admin_address);
    let request_id = treasury.request_withdrawal(
        beneficiary_address,
        100000000000000000000_u256,
        'unauthorized_cancel'
    );
    stop_cheat_caller_address(treasury.contract_address);
    
    // Unauthorized user tries to cancel
    start_cheat_caller_address(treasury.contract_address, unauthorized_address);
    treasury.cancel_withdrawal(request_id);
}

#[test]
fn test_signer_management() {
    let treasury = deploy_treasury();
    let admin_address = contract_address_const::<ADMIN>();
    let new_signer = contract_address_const::<'new_signer'>();
    let signer1_address = contract_address_const::<SIGNER1>();
    
    start_cheat_caller_address(treasury.contract_address, admin_address);
    
    // Add new signer
    treasury.add_authorized_signer(new_signer);
    assert(treasury.is_authorized_signer(new_signer), 'New signer not added');
    
    // Remove existing signer
    treasury.remove_authorized_signer(signer1_address);
    assert(!treasury.is_authorized_signer(signer1_address), 'Signer not removed');
    
    stop_cheat_caller_address(treasury.contract_address);
}

#[test]
#[should_panic(expected: "Only admin can add signer")]
fn test_unauthorized_signer_management() {
    let treasury = deploy_treasury();
    let unauthorized_address = contract_address_const::<'unauthorized'>();
    let new_signer = contract_address_const::<'new_signer'>();
    
    start_cheat_caller_address(treasury.contract_address, unauthorized_address);
    treasury.add_authorized_signer(new_signer);
}

#[test]
fn test_parameter_updates() {
    let treasury = deploy_treasury();
    let admin_address = contract_address_const::<ADMIN>();
    
    start_cheat_caller_address(treasury.contract_address, admin_address);
    
    // Update required approvals
    treasury.set_required_approvals(3_u32);
    assert(treasury.get_required_approvals() == 3, 'Required approvals not updated');
    
    // Update withdrawal limit
    let new_limit = 2000000000000000000000_u256; // 2000 units
    treasury.set_withdrawal_limit(new_limit);
    assert(treasury.get_withdrawal_limit() == new_limit, 'Withdrawal limit not updated');
    
    stop_cheat_caller_address(treasury.contract_address);
}

#[test]
#[should_panic(expected: "Invalid approvals")]
fn test_zero_required_approvals() {
    let treasury = deploy_treasury();
    let admin_address = contract_address_const::<ADMIN>();
    
    start_cheat_caller_address(treasury.contract_address, admin_address);
    treasury.set_required_approvals(0);
}
