# Transaction Management Smart Contract

## Overview

The Transaction Management Contract is a comprehensive Soroban smart contract that serves as a central coordinator for complex multi-step NFT operations within the NFTopia ecosystem. It provides atomic transaction guarantees, batch processing capabilities, gas optimization, and state management for intricate NFT workflows.

## Features

### Core Capabilities

- **Transaction Coordination**: Manage multi-step NFT operations as atomic transactions
- **State Machine**: Track transaction lifecycle through distinct states (Draft → Pending → Executing → Completed/Failed/RolledBack)
- **Multi-Signature Support**: Require multiple signers for transaction execution
- **Dependency Resolution**: Automatically resolve and execute operations in the correct order based on dependencies
- **Gas Optimization**: Estimate gas costs and provide optimization suggestions
- **Batch Operations**: Process multiple transactions efficiently in batches
- **Error Recovery**: Automatic rollback capabilities when operations fail
- **Cross-Contract Coordination**: Seamlessly interact with NFT, Marketplace, and Settlement contracts

### Transaction Lifecycle States

1. **Draft**: Transaction created, operations can be added/modified
2. **Pending**: Transaction submitted, awaiting signatures and execution
3. **Executing**: Transaction is currently being executed
4. **Completed**: All operations executed successfully
5. **Failed**: Execution failed (no rollback performed)
6. **Cancelled**: Transaction cancelled by creator
7. **RolledBack**: Transaction rolled back due to operation failure

## Data Structures

### Transaction

```rust
pub struct Transaction {
    pub id: String,                // Unique transaction ID (e.g., "TX0000000000000001")
    pub creator: Address,          // Transaction creator address
    pub status: TransactionStatus, // Current lifecycle status
    pub operations: Vec<Operation>, // List of operations to execute
    pub signatures: Map<Address, BytesN<64>>, // Multi-sig signatures
    pub required_signers: Vec<Address>, // Required signers for execution
    pub gas_budget: u64,           // Total gas budget
    pub gas_used: u64,             // Gas consumed so far
    pub created_at: u64,           // Creation timestamp
    pub executed_at: u64,          // Execution timestamp
    pub error_message: String,     // Error message (if failed)
    pub checkpoint: u32,           // Last successful operation index
}
```

### Operation Types

- **Mint**: Mint new NFT
- **Transfer**: Transfer NFT ownership
- **Burn**: Burn NFT
- **ListForSale**: List NFT on marketplace
- **CancelListing**: Cancel marketplace listing
- **Purchase**: Purchase NFT from marketplace
- **PlaceBid**: Place bid in auction
- **AcceptBid**: Accept bid in auction
- **Bundle**: Bundle multiple NFTs together
- **Unbundle**: Unbundle NFTs
- **UpdateMetadata**: Update NFT metadata
- **SetRoyalty**: Set royalty information

### Operation

```rust
pub struct Operation {
    pub op_type: OperationType,
    pub target_contract: Address,  // Contract to invoke
    pub target_nft_id: String,     // NFT identifier
    pub params: Map<String, String>, // Operation parameters
    pub gas_estimate: u64,         // Estimated gas cost
    pub dependencies: Vec<u32>,    // Operation dependencies (indices)
}
```

## Core Functions

### Transaction Management

#### `initialize(admin: Address)`
Initialize the contract with an admin address.

#### `create_transaction(creator: Address, required_signers: Vec<Address>, gas_budget: u64) -> String`
Create a new transaction and return its unique ID.

**Parameters:**
- `creator`: Transaction creator address
- `required_signers`: List of addresses required to sign the transaction
- `gas_budget`: Maximum gas allowed for transaction execution

**Returns:** Transaction ID (e.g., "TX0000000000000001")

#### `add_operation(tx_id: String, op_type: OperationType, target_contract: Address, target_nft_id: String, params: Map<String, String>, dependencies: Vec<u32>) -> Result<(), Error>`
Add an operation to a draft transaction.

**Parameters:**
- `tx_id`: Transaction ID
- `op_type`: Type of operation (Mint, Transfer, etc.)
- `target_contract`: Contract address to invoke
- `target_nft_id`: NFT identifier
- `params`: Operation-specific parameters
- `dependencies`: Indices of operations this depends on

#### `submit_transaction(tx_id: String) -> Result<(), Error>`
Submit a transaction for execution (moves from Draft to Pending state).

#### `sign_transaction(tx_id: String, signer: Address, signature: BytesN<64>) -> Result<(), Error>`
Sign a transaction (required for multi-sig transactions).

#### `execute_transaction(tx_id: String) -> Result<(), Error>`
Execute a pending transaction. Requires all required signatures.

#### `cancel_transaction(tx_id: String) -> Result<(), Error>`
Cancel a draft or pending transaction.

#### `estimate_gas(tx_id: String) -> Result<GasEstimate, Error>`
Estimate gas cost for a transaction and receive optimization suggestions.

### Batch Operations

#### `batch_create(creator: Address, count: u32, required_signers: Vec<Address>, gas_budget: u64) -> Vec<String>`
Create multiple transactions in a single call.

#### `batch_execute(tx_ids: Vec<String>) -> BatchResult`
Execute multiple transactions in batch.

**Returns:**
```rust
pub struct BatchResult {
    pub successful: Vec<String>,  // Transaction IDs that succeeded
    pub failed: Vec<String>,      // Transaction IDs that failed
    pub total_gas_used: u64,      // Total gas consumed
}
```

#### `batch_verify(tx_ids: Vec<String>) -> Vec<bool>`
Verify whether multiple transactions are ready for execution.

#### `parallel_execution(tx_ids: Vec<String>) -> BatchResult`
Execute independent transactions (currently sequential due to Soroban limitations).

### Query Functions

#### `get_transaction(tx_id: String) -> Result<Transaction, Error>`
Retrieve complete transaction details.

#### `get_status(tx_id: String) -> Result<TransactionStatus, Error>`
Get transaction status.

#### `get_pending_transactions() -> Vec<String>`
Get list of all pending transaction IDs.

#### `get_completed_transactions() -> Vec<String>`
Get list of all completed transaction IDs.

#### `get_failed_transactions() -> Vec<String>`
Get list of all failed transaction IDs.

### Admin Functions

#### `set_gas_price(admin: Address, new_price: u64)`
Update the base gas price (admin only).

## Usage Examples

### Example 1: Simple NFT Mint and Transfer

```rust
use soroban_sdk::{Env, Address, Map, Vec, String};

// Initialize contract
let admin = Address::generate(&env);
client.initialize(&admin);

// Create transaction
let creator = Address::generate(&env);
let signers = Vec::from_array(&env, [creator.clone()]);
let tx_id = client.create_transaction(&creator, &signers, &100000);

// Add mint operation
let nft_contract = Address::generate(&env);
let params = Map::new(&env);
let no_deps = Vec::new(&env);

client.add_operation(
    &tx_id,
    &OperationType::Mint,
    &nft_contract,
    &String::from_str(&env, "NFT_001"),
    &params,
    &no_deps,
);

// Add transfer operation (depends on mint)
let deps_on_mint = Vec::from_array(&env, [0u32]);
client.add_operation(
    &tx_id,
    &OperationType::Transfer,
    &nft_contract,
    &String::from_str(&env, "NFT_001"),
    &params,
    &deps_on_mint,
);

// Submit and execute
client.submit_transaction(&tx_id);
client.execute_transaction(&tx_id);
```

### Example 2: Multi-Signature Transaction

```rust
// Create transaction requiring two signers
let signer1 = Address::generate(&env);
let signer2 = Address::generate(&env);
let signers = Vec::from_array(&env, [signer1.clone(), signer2.clone()]);

let tx_id = client.create_transaction(&creator, &signers, &100000);

// Add operations...
client.add_operation(...);

// Submit transaction
client.submit_transaction(&tx_id);

// Both signers must sign
let signature1 = BytesN::from_array(&env, &[0u8; 64]);
let signature2 = BytesN::from_array(&env, &[1u8; 64]);

client.sign_transaction(&tx_id, &signer1, &signature1);
client.sign_transaction(&tx_id, &signer2, &signature2);

// Now execute
client.execute_transaction(&tx_id);
```

### Example 3: Batch Processing

```rust
// Create multiple transactions
let tx_ids = client.batch_create(&creator, &5, &signers, &100000);

// Add operations to each transaction
for tx_id in tx_ids.iter() {
    client.add_operation(&tx_id, ...);
    client.submit_transaction(&tx_id);
}

// Execute in batch
let result = client.batch_execute(&tx_ids);

println!("Successful: {}", result.successful.len());
println!("Failed: {}", result.failed.len());
println!("Total gas: {}", result.total_gas_used);
```

### Example 4: Complex Workflow with Dependencies

```rust
let tx_id = client.create_transaction(&creator, &signers, &200000);

// Operation 0: Mint NFT
client.add_operation(
    &tx_id,
    &OperationType::Mint,
    &nft_contract,
    &String::from_str(&env, "NFT_001"),
    &params,
    &Vec::new(&env),
);

// Operation 1: Set Royalty (depends on Mint)
client.add_operation(
    &tx_id,
    &OperationType::SetRoyalty,
    &nft_contract,
    &String::from_str(&env, "NFT_001"),
    &royalty_params,
    &Vec::from_array(&env, [0u32]),
);

// Operation 2: List for Sale (depends on Mint and SetRoyalty)
client.add_operation(
    &tx_id,
    &OperationType::ListForSale,
    &marketplace_contract,
    &String::from_str(&env, "NFT_001"),
    &listing_params,
    &Vec::from_array(&env, [0u32, 1u32]),
);

// Execute - operations will run in correct order
client.submit_transaction(&tx_id);
client.execute_transaction(&tx_id);
```

## Gas Estimation

The contract provides gas estimation to help optimize transaction costs:

```rust
let estimate = client.estimate_gas(&tx_id);

println!("Total gas: {}", estimate.total_gas);
println!("Per-operation gas: {:?}", estimate.per_operation_gas);

for suggestion in estimate.optimization_suggestions.iter() {
    println!("Tip: {}", suggestion);
}
```

### Gas Estimates by Operation Type

| Operation Type | Estimated Gas |
|---------------|---------------|
| Mint | 5,000 |
| Transfer | 2,000 |
| Burn | 1,500 |
| ListForSale | 3,000 |
| CancelListing | 1,000 |
| Purchase | 4,000 |
| PlaceBid | 2,500 |
| AcceptBid | 3,500 |
| Bundle | 6,000 |
| Unbundle | 4,000 |
| UpdateMetadata | 2,000 |
| SetRoyalty | 1,500 |

## Error Handling

The contract defines the following error codes:

| Error Code | Name | Description |
|-----------|------|-------------|
| 1 | TransactionNotFound | Transaction ID does not exist |
| 2 | InvalidStatus | Operation not allowed in current state |
| 3 | UnauthorizedSigner | Signer not in required signers list |
| 4 | InsufficientSignatures | Not enough signatures to execute |
| 5 | GasBudgetExceeded | Transaction exceeded gas budget |
| 6 | OperationFailed | An operation failed during execution |
| 7 | DependencyNotMet | Operation dependency not satisfied |
| 8 | InvalidOperation | Operation parameters are invalid |
| 9 | AlreadyExecuted | Transaction already executed |
| 10 | CannotCancel | Transaction cannot be cancelled |
| 11 | CircularDependency | Circular dependency detected |

## Events

The contract emits events for all significant state changes:

### Transaction Events
- `tx_create`: Transaction created
- `tx_submit`: Transaction submitted for execution
- `tx_sign`: Transaction signed by a signer
- `tx_done`: Transaction completed successfully
- `tx_fail`: Transaction failed
- `tx_cancel`: Transaction cancelled

### Operation Events
- `op_add`: Operation added to transaction

## Security Considerations

1. **Authorization**: All state-changing functions require appropriate authorization
2. **Multi-Signature**: Supports multiple signers for high-value operations
3. **Gas Limits**: Enforces gas budgets to prevent runaway execution
4. **Dependency Validation**: Checks for circular dependencies
5. **Atomic Execution**: All-or-nothing execution with rollback on failure
6. **Idempotency**: Transaction IDs are unique and sequential

## Integration with Other Contracts

This contract is designed to coordinate with:

- **NFT Contract**: For minting, transferring, and burning NFTs
- **Collection Factory**: For creating NFT collections
- **Marketplace Settlement**: For listing, bidding, and purchasing

### Cross-Contract Call Pattern

```rust
// Example of how the contract would call other contracts
fn execute_single_operation(env: &Env, operation: &Operation) -> Result<(), Error> {
    match operation.op_type {
        OperationType::Mint => {
            let nft_client = NFTContractClient::new(env, &operation.target_contract);
            nft_client.mint(&operation.target_nft_id, &params);
            Ok(())
        }
        OperationType::Purchase => {
            let marketplace_client = MarketplaceClient::new(env, &operation.target_contract);
            marketplace_client.execute_purchase(&operation.target_nft_id);
            Ok(())
        }
        // ... other operations
    }
}
```

## Building and Testing

### Build the contract

```bash
cd contracts/transaction_contract
cargo build --target wasm32-unknown-unknown --release
```

### Run tests

```bash
cargo test
```

### Optimize WASM output

```bash
cargo build --target wasm32-unknown-unknown --release --profile release
```

The `release` profile is configured in the workspace `Cargo.toml` with:
- Size optimization (`opt-level = "z"`)
- Overflow checks enabled
- Link-time optimization (LTO)
- Symbol stripping

## Future Enhancements

Potential improvements for future versions:

1. **True Parallel Execution**: When Soroban supports it, enable parallel execution of independent operations
2. **Advanced Rollback**: More sophisticated compensating transactions for complex rollbacks
3. **Gas Price Prediction**: Dynamic gas price adjustment based on network conditions
4. **Transaction Templates**: Pre-defined templates for common workflows
5. **Scheduled Execution**: Time-based execution triggers
6. **Transaction Replay**: Ability to replay failed transactions after fixes
7. **Audit Trail**: Enhanced logging for compliance and debugging
8. **Cross-Chain Coordination**: Support for multi-chain transactions

## License

Part of the NFTopia project.

## Contributing

Contributions are welcome! Please follow the existing code style and add tests for new features.
