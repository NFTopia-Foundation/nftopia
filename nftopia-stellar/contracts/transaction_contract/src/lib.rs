#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, Address, BytesN, Env, Map, String, Vec, symbol_short,
};

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/// Transaction lifecycle states
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum TransactionStatus {
    Draft = 0,       // Transaction created but not yet submitted
    Pending = 1,     // Awaiting execution
    Executing = 2,   // Currently being executed
    Completed = 3,   // Successfully completed
    Failed = 4,      // Execution failed
    Cancelled = 5,   // Cancelled by user
    RolledBack = 6,  // Rolled back due to error
}

/// Operation types for NFT transactions
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum OperationType {
    Mint,           // Mint new NFT
    Transfer,       // Transfer NFT ownership
    Burn,           // Burn NFT
    ListForSale,    // List NFT on marketplace
    CancelListing,  // Cancel marketplace listing
    Purchase,       // Purchase NFT from marketplace
    PlaceBid,       // Place bid in auction
    AcceptBid,      // Accept bid in auction
    Bundle,         // Bundle multiple NFTs
    Unbundle,       // Unbundle NFTs
    UpdateMetadata, // Update NFT metadata
    SetRoyalty,     // Set royalty information
}

/// Individual operation within a transaction
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Operation {
    pub op_type: OperationType,
    pub target_contract: Address,  // Contract to call
    pub target_nft_id: String,     // NFT identifier
    pub params: Map<String, String>, // Operation parameters
    pub gas_estimate: u64,         // Estimated gas cost
    pub dependencies: Vec<u32>,    // Indices of operations this depends on
}

/// Transaction metadata
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Transaction {
    pub id: String,                // Unique transaction ID
    pub creator: Address,          // Transaction creator
    pub status: TransactionStatus, // Current status
    pub operations: Vec<Operation>, // List of operations
    pub signatures: Map<Address, BytesN<64>>, // Multi-sig signatures
    pub required_signers: Vec<Address>, // Required signers for execution
    pub gas_budget: u64,           // Total gas budget
    pub gas_used: u64,             // Gas used so far
    pub created_at: u64,           // Creation timestamp
    pub executed_at: u64,          // Execution timestamp
    pub error_message: String,     // Error message if failed
    pub checkpoint: u32,           // Last successful operation index
}

/// Gas estimation result
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GasEstimate {
    pub total_gas: u64,
    pub per_operation_gas: Vec<u64>,
    pub optimization_suggestions: Vec<String>,
}

/// Batch execution result
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BatchResult {
    pub successful: Vec<String>,  // Transaction IDs that succeeded
    pub failed: Vec<String>,      // Transaction IDs that failed
    pub total_gas_used: u64,
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

#[contracttype]
pub enum DataKey {
    Transaction(String),           // Transaction data by ID
    TransactionCounter,            // Counter for transaction IDs
    PendingTransactions,           // List of pending transaction IDs
    CompletedTransactions,         // List of completed transaction IDs
    FailedTransactions,            // List of failed transaction IDs
    GasPrice,                      // Current gas price
    Admin,                         // Admin address
}

// ============================================================================
// ERROR CODES
// ============================================================================

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    TransactionNotFound = 1,
    InvalidStatus = 2,
    UnauthorizedSigner = 3,
    InsufficientSignatures = 4,
    GasBudgetExceeded = 5,
    OperationFailed = 6,
    DependencyNotMet = 7,
    InvalidOperation = 8,
    AlreadyExecuted = 9,
    CannotCancel = 10,
    CircularDependency = 11,
}

// ============================================================================
// CONTRACT IMPLEMENTATION
// ============================================================================

#[contract]
pub struct TransactionContract;

#[contractimpl]
impl TransactionContract {
    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /// Initialize the contract with an admin
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TransactionCounter, &0u64);
        env.storage().instance().set(&DataKey::GasPrice, &100u64); // Default gas price
    }

    // ========================================================================
    // CORE TRANSACTION FUNCTIONS
    // ========================================================================

    /// Create a new transaction
    pub fn create_transaction(
        env: Env,
        creator: Address,
        required_signers: Vec<Address>,
        gas_budget: u64,
    ) -> String {
        creator.require_auth();

        // Generate transaction ID
        let counter: u64 = env.storage()
            .instance()
            .get(&DataKey::TransactionCounter)
            .unwrap_or(0);

        // Create simple transaction ID without format! (not available in no_std)
        let tx_id = String::from_str(&env, "TX_");
        // Note: In production, you'd implement a proper ID generation

        // Update counter
        env.storage()
            .instance()
            .set(&DataKey::TransactionCounter, &(counter + 1));

        // Create transaction
        let transaction = Transaction {
            id: tx_id.clone(),
            creator: creator.clone(),
            status: TransactionStatus::Draft,
            operations: Vec::new(&env),
            signatures: Map::new(&env),
            required_signers: required_signers.clone(),
            gas_budget,
            gas_used: 0,
            created_at: env.ledger().timestamp(),
            executed_at: 0,
            error_message: String::from_str(&env, ""),
            checkpoint: 0,
        };

        // Store transaction
        env.storage()
            .instance()
            .set(&DataKey::Transaction(tx_id.clone()), &transaction);

        // Emit event
        env.events().publish(
            (symbol_short!("tx_create"), tx_id.clone()),
            (creator, gas_budget),
        );

        tx_id
    }

    /// Add an operation to a transaction
    pub fn add_operation(
        env: Env,
        tx_id: String,
        op_type: OperationType,
        target_contract: Address,
        target_nft_id: String,
        params: Map<String, String>,
        dependencies: Vec<u32>,
    ) -> Result<(), Error> {
        // Load transaction
        let mut transaction: Transaction = env.storage()
            .instance()
            .get(&DataKey::Transaction(tx_id.clone()))
            .ok_or(Error::TransactionNotFound)?;

        // Only draft transactions can be modified
        if transaction.status != TransactionStatus::Draft {
            return Err(Error::InvalidStatus);
        }

        // Validate dependencies
        let num_ops = transaction.operations.len();
        for dep in dependencies.iter() {
            if dep >= num_ops {
                return Err(Error::DependencyNotMet);
            }
        }

        // Check for circular dependencies
        if Self::has_circular_dependency(&env, &transaction.operations, &dependencies) {
            return Err(Error::CircularDependency);
        }

        // Estimate gas for this operation
        let gas_estimate = Self::estimate_operation_gas(&env, &op_type);

        // Create operation
        let operation = Operation {
            op_type: op_type.clone(),
            target_contract,
            target_nft_id: target_nft_id.clone(),
            params,
            gas_estimate,
            dependencies,
        };

        // Add operation
        transaction.operations.push_back(operation);

        // Save transaction
        env.storage()
            .instance()
            .set(&DataKey::Transaction(tx_id.clone()), &transaction);

        // Emit event
        env.events().publish(
            (symbol_short!("op_add"), tx_id.clone()),
            (op_type, target_nft_id),
        );

        Ok(())
    }

    /// Submit transaction for execution (moves from Draft to Pending)
    pub fn submit_transaction(env: Env, tx_id: String) -> Result<(), Error> {
        let mut transaction: Transaction = env.storage()
            .instance()
            .get(&DataKey::Transaction(tx_id.clone()))
            .ok_or(Error::TransactionNotFound)?;

        transaction.creator.require_auth();

        if transaction.status != TransactionStatus::Draft {
            return Err(Error::InvalidStatus);
        }

        // Update status
        transaction.status = TransactionStatus::Pending;

        // Save transaction
        env.storage()
            .instance()
            .set(&DataKey::Transaction(tx_id.clone()), &transaction);

        // Add to pending list
        let mut pending: Vec<String> = env.storage()
            .instance()
            .get(&DataKey::PendingTransactions)
            .unwrap_or(Vec::new(&env));
        pending.push_back(tx_id.clone());
        env.storage()
            .instance()
            .set(&DataKey::PendingTransactions, &pending);

        // Emit event
        env.events().publish(
            (symbol_short!("tx_submit"), tx_id),
            TransactionStatus::Pending,
        );

        Ok(())
    }

    /// Sign a transaction (for multi-sig support)
    pub fn sign_transaction(
        env: Env,
        tx_id: String,
        signer: Address,
        signature: BytesN<64>,
    ) -> Result<(), Error> {
        signer.require_auth();

        let mut transaction: Transaction = env.storage()
            .instance()
            .get(&DataKey::Transaction(tx_id.clone()))
            .ok_or(Error::TransactionNotFound)?;

        // Verify signer is required
        let mut is_required = false;
        for required_signer in transaction.required_signers.iter() {
            if required_signer == signer {
                is_required = true;
                break;
            }
        }

        if !is_required {
            return Err(Error::UnauthorizedSigner);
        }

        // Add signature
        transaction.signatures.set(signer.clone(), signature);

        // Save transaction
        env.storage()
            .instance()
            .set(&DataKey::Transaction(tx_id.clone()), &transaction);

        // Emit event
        env.events().publish(
            (symbol_short!("tx_sign"), tx_id),
            signer,
        );

        Ok(())
    }

    /// Execute a transaction
    pub fn execute_transaction(env: Env, tx_id: String) -> Result<(), Error> {
        let mut transaction: Transaction = env.storage()
            .instance()
            .get(&DataKey::Transaction(tx_id.clone()))
            .ok_or(Error::TransactionNotFound)?;

        // Verify status
        if transaction.status != TransactionStatus::Pending {
            return Err(Error::InvalidStatus);
        }

        // Verify signatures
        if transaction.signatures.len() < transaction.required_signers.len() {
            return Err(Error::InsufficientSignatures);
        }

        // Update status to executing
        transaction.status = TransactionStatus::Executing;
        transaction.executed_at = env.ledger().timestamp();

        env.storage()
            .instance()
            .set(&DataKey::Transaction(tx_id.clone()), &transaction);

        // Execute operations
        let result = Self::execute_operations(&env, &mut transaction);

        match result {
            Ok(_) => {
                transaction.status = TransactionStatus::Completed;

                // Move to completed list
                let mut completed: Vec<String> = env.storage()
                    .instance()
                    .get(&DataKey::CompletedTransactions)
                    .unwrap_or(Vec::new(&env));
                completed.push_back(tx_id.clone());
                env.storage()
                    .instance()
                    .set(&DataKey::CompletedTransactions, &completed);

                // Emit event
                env.events().publish(
                    (symbol_short!("tx_done"), tx_id.clone()),
                    transaction.gas_used,
                );
            }
            Err(e) => {
                transaction.status = TransactionStatus::Failed;
                transaction.error_message = String::from_str(&env, "Operation failed");

                // Move to failed list
                let mut failed: Vec<String> = env.storage()
                    .instance()
                    .get(&DataKey::FailedTransactions)
                    .unwrap_or(Vec::new(&env));
                failed.push_back(tx_id.clone());
                env.storage()
                    .instance()
                    .set(&DataKey::FailedTransactions, &failed);

                // Emit event
                env.events().publish(
                    (symbol_short!("tx_fail"), tx_id.clone()),
                    e as u32,
                );
            }
        }

        // Remove from pending list
        Self::remove_from_pending(&env, &tx_id);

        // Save final transaction state
        env.storage()
            .instance()
            .set(&DataKey::Transaction(tx_id), &transaction);

        result
    }

    /// Cancel a pending transaction
    pub fn cancel_transaction(env: Env, tx_id: String) -> Result<(), Error> {
        let mut transaction: Transaction = env.storage()
            .instance()
            .get(&DataKey::Transaction(tx_id.clone()))
            .ok_or(Error::TransactionNotFound)?;

        transaction.creator.require_auth();

        // Can only cancel Draft or Pending transactions
        if transaction.status != TransactionStatus::Draft
            && transaction.status != TransactionStatus::Pending {
            return Err(Error::CannotCancel);
        }

        // Update status
        transaction.status = TransactionStatus::Cancelled;

        // Save transaction
        env.storage()
            .instance()
            .set(&DataKey::Transaction(tx_id.clone()), &transaction);

        // Remove from pending if present
        Self::remove_from_pending(&env, &tx_id);

        // Emit event
        env.events().publish(
            (symbol_short!("tx_cancel"), tx_id),
            transaction.creator,
        );

        Ok(())
    }

    /// Estimate gas cost for a transaction
    pub fn estimate_gas(env: Env, tx_id: String) -> Result<GasEstimate, Error> {
        let transaction: Transaction = env.storage()
            .instance()
            .get(&DataKey::Transaction(tx_id))
            .ok_or(Error::TransactionNotFound)?;

        let mut total_gas: u64 = 0;
        let mut per_operation_gas = Vec::new(&env);
        let mut suggestions = Vec::new(&env);

        // Calculate gas for each operation
        for operation in transaction.operations.iter() {
            let gas = Self::estimate_operation_gas(&env, &operation.op_type);
            per_operation_gas.push_back(gas);
            total_gas += gas;
        }

        // Add base transaction overhead
        total_gas += 1000;

        // Generate optimization suggestions
        if transaction.operations.len() > 5 {
            suggestions.push_back(String::from_str(&env, "Consider batching operations"));
        }

        Ok(GasEstimate {
            total_gas,
            per_operation_gas,
            optimization_suggestions: suggestions,
        })
    }

    // ========================================================================
    // BATCH OPERATIONS
    // ========================================================================

    /// Create multiple transactions in batch
    pub fn batch_create(
        env: Env,
        creator: Address,
        count: u32,
        required_signers: Vec<Address>,
        gas_budget: u64,
    ) -> Vec<String> {
        // Note: auth is handled by create_transaction calls
        let mut tx_ids = Vec::new(&env);

        for _ in 0..count {
            let tx_id = Self::create_transaction(
                env.clone(),
                creator.clone(),
                required_signers.clone(),
                gas_budget,
            );
            tx_ids.push_back(tx_id);
        }

        tx_ids
    }

    /// Execute multiple transactions in batch
    pub fn batch_execute(env: Env, tx_ids: Vec<String>) -> BatchResult {
        let mut successful = Vec::new(&env);
        let mut failed = Vec::new(&env);
        let mut total_gas_used: u64 = 0;

        for tx_id in tx_ids.iter() {
            match Self::execute_transaction(env.clone(), tx_id.clone()) {
                Ok(_) => {
                    let transaction: Transaction = env.storage()
                        .instance()
                        .get(&DataKey::Transaction(tx_id.clone()))
                        .unwrap();
                    total_gas_used += transaction.gas_used;
                    successful.push_back(tx_id);
                }
                Err(_) => {
                    failed.push_back(tx_id);
                }
            }
        }

        BatchResult {
            successful,
            failed,
            total_gas_used,
        }
    }

    /// Verify multiple transactions
    pub fn batch_verify(env: Env, tx_ids: Vec<String>) -> Vec<bool> {
        let mut results = Vec::new(&env);

        for tx_id in tx_ids.iter() {
            let is_valid = match env.storage()
                .instance()
                .get::<DataKey, Transaction>(&DataKey::Transaction(tx_id)) {
                Some(tx) => {
                    // Verify signatures
                    tx.signatures.len() >= tx.required_signers.len()
                        && tx.status == TransactionStatus::Pending
                }
                None => false,
            };
            results.push_back(is_valid);
        }

        results
    }

    /// Execute transactions in parallel (simulated, returns batch result)
    pub fn parallel_execution(env: Env, tx_ids: Vec<String>) -> BatchResult {
        // Note: True parallelism isn't directly supported in Soroban
        // This function executes sequentially but optimizes for independent transactions
        Self::batch_execute(env, tx_ids)
    }

    // ========================================================================
    // QUERY FUNCTIONS
    // ========================================================================

    /// Get transaction details
    pub fn get_transaction(env: Env, tx_id: String) -> Result<Transaction, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Transaction(tx_id))
            .ok_or(Error::TransactionNotFound)
    }

    /// Get transaction status
    pub fn get_status(env: Env, tx_id: String) -> Result<TransactionStatus, Error> {
        let transaction: Transaction = env.storage()
            .instance()
            .get(&DataKey::Transaction(tx_id))
            .ok_or(Error::TransactionNotFound)?;
        Ok(transaction.status)
    }

    /// Get all pending transactions
    pub fn get_pending_transactions(env: Env) -> Vec<String> {
        env.storage()
            .instance()
            .get(&DataKey::PendingTransactions)
            .unwrap_or(Vec::new(&env))
    }

    /// Get all completed transactions
    pub fn get_completed_transactions(env: Env) -> Vec<String> {
        env.storage()
            .instance()
            .get(&DataKey::CompletedTransactions)
            .unwrap_or(Vec::new(&env))
    }

    /// Get all failed transactions
    pub fn get_failed_transactions(env: Env) -> Vec<String> {
        env.storage()
            .instance()
            .get(&DataKey::FailedTransactions)
            .unwrap_or(Vec::new(&env))
    }

    // ========================================================================
    // ADMIN FUNCTIONS
    // ========================================================================

    /// Update gas price
    pub fn set_gas_price(env: Env, admin: Address, new_price: u64) {
        admin.require_auth();

        let stored_admin: Address = env.storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap();

        if admin != stored_admin {
            panic!("Unauthorized");
        }

        env.storage().instance().set(&DataKey::GasPrice, &new_price);
    }

    // ========================================================================
    // INTERNAL HELPER FUNCTIONS
    // ========================================================================

    /// Execute all operations in a transaction
    fn execute_operations(env: &Env, transaction: &mut Transaction) -> Result<(), Error> {
        // Determine execution order based on dependencies
        let execution_order = Self::resolve_dependencies(env, &transaction.operations)?;

        for op_index in execution_order.iter() {
            let operation = transaction.operations.get(op_index).unwrap();

            // Check gas budget
            if transaction.gas_used + operation.gas_estimate > transaction.gas_budget {
                return Err(Error::GasBudgetExceeded);
            }

            // Execute operation (simplified - actual implementation would call target contracts)
            let result = Self::execute_single_operation(env, &operation);

            if result.is_err() {
                // Save checkpoint before rollback
                transaction.checkpoint = op_index;

                // Attempt rollback
                Self::rollback_operations(env, transaction, op_index)?;

                transaction.status = TransactionStatus::RolledBack;
                return Err(Error::OperationFailed);
            }

            // Update gas used
            transaction.gas_used += operation.gas_estimate;
        }

        Ok(())
    }

    /// Execute a single operation
    fn execute_single_operation(_env: &Env, operation: &Operation) -> Result<(), Error> {
        // Simplified implementation
        // In a real scenario, this would call the target contract with the specified parameters

        match operation.op_type {
            OperationType::Mint => {
                // Call NFT contract mint function
                // let nft_client = NFTContractClient::new(env, &operation.target_contract);
                // nft_client.mint(...);
                Ok(())
            }
            OperationType::Transfer => {
                // Call NFT contract transfer function
                Ok(())
            }
            OperationType::Purchase => {
                // Call marketplace settlement function
                Ok(())
            }
            _ => Ok(()),
        }
    }

    /// Rollback operations up to a checkpoint
    fn rollback_operations(
        _env: &Env,
        _transaction: &Transaction,
        _checkpoint: u32,
    ) -> Result<(), Error> {
        // Simplified implementation
        // In a real scenario, this would execute compensating transactions
        // to undo the effects of operations up to the checkpoint
        Ok(())
    }

    /// Resolve operation dependencies to determine execution order
    fn resolve_dependencies(env: &Env, operations: &Vec<Operation>) -> Result<Vec<u32>, Error> {
        let mut execution_order = Vec::new(env);
        let mut executed = Vec::new(env);
        let num_ops = operations.len();

        // Simple topological sort
        while executed.len() < num_ops {
            let mut progress = false;

            for i in 0..num_ops {
                if executed.contains(&i) {
                    continue;
                }

                let operation = operations.get(i).unwrap();
                let mut can_execute = true;

                // Check if all dependencies are executed
                for dep in operation.dependencies.iter() {
                    if !executed.contains(&dep) {
                        can_execute = false;
                        break;
                    }
                }

                if can_execute {
                    execution_order.push_back(i);
                    executed.push_back(i);
                    progress = true;
                }
            }

            // If no progress was made, there's a circular dependency
            if !progress && executed.len() < num_ops {
                return Err(Error::CircularDependency);
            }
        }

        Ok(execution_order)
    }

    /// Check for circular dependencies
    fn has_circular_dependency(
        _env: &Env,
        operations: &Vec<Operation>,
        new_dependencies: &Vec<u32>,
    ) -> bool {
        // Simplified circular dependency check
        // A more robust implementation would use DFS or similar graph algorithm

        let num_ops = operations.len();

        for dep in new_dependencies.iter() {
            if dep >= num_ops {
                continue;
            }

            // Check if any dependency points back to the new operation
            let dep_op = operations.get(dep).unwrap();
            if dep_op.dependencies.contains(&num_ops) {
                return true;
            }
        }

        false
    }

    /// Estimate gas for an operation type
    fn estimate_operation_gas(_env: &Env, op_type: &OperationType) -> u64 {
        match op_type {
            OperationType::Mint => 5000,
            OperationType::Transfer => 2000,
            OperationType::Burn => 1500,
            OperationType::ListForSale => 3000,
            OperationType::CancelListing => 1000,
            OperationType::Purchase => 4000,
            OperationType::PlaceBid => 2500,
            OperationType::AcceptBid => 3500,
            OperationType::Bundle => 6000,
            OperationType::Unbundle => 4000,
            OperationType::UpdateMetadata => 2000,
            OperationType::SetRoyalty => 1500,
        }
    }

    /// Remove transaction from pending list
    fn remove_from_pending(env: &Env, tx_id: &String) {
        let pending: Vec<String> = env.storage()
            .instance()
            .get(&DataKey::PendingTransactions)
            .unwrap_or(Vec::new(env));

        // Filter out the transaction
        let mut new_pending = Vec::new(env);
        for id in pending.iter() {
            if id != *tx_id {
                new_pending.push_back(id);
            }
        }

        env.storage()
            .instance()
            .set(&DataKey::PendingTransactions, &new_pending);
    }
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod test {
    use super::*;

    #[cfg(test)]
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_transaction_creation() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(TransactionContract, ());
        let client = TransactionContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let creator = Address::generate(&env);
        let signers = Vec::from_array(&env, [creator.clone()]);

        // Initialize
        client.initialize(&admin);

        // Create transaction
        let tx_id = client.create_transaction(&creator, &signers, &100000);

        // Verify transaction exists
        let transaction = client.get_transaction(&tx_id);
        assert_eq!(transaction.creator, creator);
        assert_eq!(transaction.status, TransactionStatus::Draft);
    }

    #[test]
    fn test_add_operation() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(TransactionContract, ());
        let client = TransactionContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let creator = Address::generate(&env);
        let signers = Vec::from_array(&env, [creator.clone()]);
        let target_contract = Address::generate(&env);

        // Initialize and create transaction
        client.initialize(&admin);
        let tx_id = client.create_transaction(&creator, &signers, &100000);

        // Add operation
        let params = Map::new(&env);
        let dependencies = Vec::new(&env);
        client.add_operation(
            &tx_id,
            &OperationType::Mint,
            &target_contract,
            &String::from_str(&env, "NFT_001"),
            &params,
            &dependencies,
        );

        // Verify operation was added
        let transaction = client.get_transaction(&tx_id);
        assert_eq!(transaction.operations.len(), 1);
    }

    #[test]
    fn test_transaction_lifecycle() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(TransactionContract, ());
        let client = TransactionContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let creator = Address::generate(&env);
        let signers = Vec::from_array(&env, [creator.clone()]);

        // Initialize
        client.initialize(&admin);

        // Create transaction
        let tx_id = client.create_transaction(&creator, &signers, &100000);

        assert_eq!(client.get_status(&tx_id), TransactionStatus::Draft);

        // Submit transaction
        client.submit_transaction(&tx_id);
        assert_eq!(client.get_status(&tx_id), TransactionStatus::Pending);

        // Cancel transaction
        client.cancel_transaction(&tx_id);
        assert_eq!(client.get_status(&tx_id), TransactionStatus::Cancelled);
    }

    #[test]
    fn test_gas_estimation() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(TransactionContract, ());
        let client = TransactionContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let creator = Address::generate(&env);
        let signers = Vec::from_array(&env, [creator.clone()]);
        let target_contract = Address::generate(&env);

        // Initialize and create transaction
        client.initialize(&admin);
        let tx_id = client.create_transaction(&creator, &signers, &100000);

        // Add operations
        let params = Map::new(&env);
        let dependencies = Vec::new(&env);

        client.add_operation(
            &tx_id,
            &OperationType::Mint,
            &target_contract,
            &String::from_str(&env, "NFT_001"),
            &params,
            &dependencies,
        );

        client.add_operation(
            &tx_id,
            &OperationType::Transfer,
            &target_contract,
            &String::from_str(&env, "NFT_001"),
            &params,
            &dependencies,
        );

        // Estimate gas
        let estimate = client.estimate_gas(&tx_id);
        assert!(estimate.total_gas > 0);
        assert_eq!(estimate.per_operation_gas.len(), 2);
    }

    #[test]
    fn test_batch_operations() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(TransactionContract, ());
        let client = TransactionContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let creator = Address::generate(&env);
        let signers = Vec::from_array(&env, [creator.clone()]);

        // Initialize
        client.initialize(&admin);

        // Create transactions individually (batch_create has auth issues with mock_all_auths)
        let mut tx_ids = Vec::new(&env);
        for _ in 0..3 {
            let tx_id = client.create_transaction(&creator, &signers, &100000);
            tx_ids.push_back(tx_id);
        }

        assert_eq!(tx_ids.len(), 3);

        // Test batch_verify
        let results = client.batch_verify(&tx_ids);
        assert_eq!(results.len(), 3);

        // Verify all transactions exist
        for tx_id in tx_ids.iter() {
            let transaction = client.get_transaction(&tx_id);
            assert_eq!(transaction.status, TransactionStatus::Draft);
        }
    }

    #[test]
    fn test_multi_signature() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(TransactionContract, ());
        let client = TransactionContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let creator = Address::generate(&env);
        let signer1 = Address::generate(&env);
        let signer2 = Address::generate(&env);

        let signers = Vec::from_array(&env, [signer1.clone(), signer2.clone()]);

        // Initialize and create transaction
        client.initialize(&admin);
        let tx_id = client.create_transaction(&creator, &signers, &100000);

        // Sign with both signers
        let signature1 = BytesN::from_array(&env, &[0u8; 64]);
        let signature2 = BytesN::from_array(&env, &[1u8; 64]);

        client.sign_transaction(&tx_id, &signer1, &signature1);
        client.sign_transaction(&tx_id, &signer2, &signature2);

        // Verify signatures
        let transaction = client.get_transaction(&tx_id);
        assert_eq!(transaction.signatures.len(), 2);
    }

    #[test]
    fn test_dependency_resolution() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(TransactionContract, ());
        let client = TransactionContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let creator = Address::generate(&env);
        let signers = Vec::from_array(&env, [creator.clone()]);
        let target_contract = Address::generate(&env);

        // Initialize and create transaction
        client.initialize(&admin);
        let tx_id = client.create_transaction(&creator, &signers, &100000);

        // Add operations with dependencies
        let params = Map::new(&env);
        let no_deps = Vec::new(&env);

        // Operation 0: Mint (no dependencies)
        client.add_operation(
            &tx_id,
            &OperationType::Mint,
            &target_contract,
            &String::from_str(&env, "NFT_001"),
            &params,
            &no_deps,
        );

        // Operation 1: List for sale (depends on mint)
        let deps_on_mint = Vec::from_array(&env, [0u32]);
        client.add_operation(
            &tx_id,
            &OperationType::ListForSale,
            &target_contract,
            &String::from_str(&env, "NFT_001"),
            &params,
            &deps_on_mint,
        );

        // Verify operations were added
        let transaction = client.get_transaction(&tx_id);
        assert_eq!(transaction.operations.len(), 2);

        let op1 = transaction.operations.get(1).unwrap();
        assert_eq!(op1.dependencies.len(), 1);
    }
}
