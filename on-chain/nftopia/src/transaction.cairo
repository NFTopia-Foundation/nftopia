/// Module for handling NFT transaction recording and querying
/// Includes purchase history tracking, price recording, and ownership status management

use starknet::{ContractAddress, get_caller_address};
use core::array::ArrayTrait;

/// Event emitted when an NFT transaction is recorded
#[derive(Drop, starknet::Event)]
pub struct TransactionRecorded {
    pub buyer: ContractAddress,
    pub token_id: u256,
    pub amount: u256,
}

/// Interface for the Transaction Module
#[starknet::interface]
pub trait ITransactionModule<TContractState> {
    /// Record a new transaction for an NFT
    /// 
    /// # Arguments
    /// 
    /// * `token_id` - The ID of the NFT being transacted
    /// * `amount` - The price/amount of the transaction
    fn record_transaction(ref self: TContractState, token_id: u256, amount: u256);

    /// Get the purchase history for a user
    /// 
    /// # Arguments
    /// 
    /// * `user` - The address of the user to get purchase history for
    /// 
    /// # Returns
    /// 
    /// * Array of token IDs purchased by the user
    fn get_user_purchases(self: @TContractState, user: ContractAddress) -> Array<u256>;

    /// Get the price of a token
    /// 
    /// # Arguments
    /// 
    /// * `token_id` - The ID of the NFT
    /// 
    /// # Returns
    /// 
    /// * The price/amount of the token's transaction
    fn get_token_price(self: @TContractState, token_id: u256) -> u256;

    /// Check if a token has been sold
    /// 
    /// # Arguments
    /// 
    /// * `token_id` - The ID of the NFT
    /// 
    /// # Returns
    /// 
    /// * Boolean indicating if the token has been sold
    fn is_token_sold(self: @TContractState, token_id: u256) -> bool;
}

/// Implementation of the Transaction Module
#[starknet::contract]
#[feature("deprecated_legacy_map")]
mod TransactionModule {
    use starknet::{ContractAddress, get_caller_address};
    use core::array::ArrayTrait;
    use super::{TransactionRecorded, ITransactionModule};

    #[allow(starknet::invalid_storage_member_types)]
    #[storage]
    struct Storage {
        // Map of user address to their purchased token IDs
        purchases: LegacyMap<ContractAddress, Array<u256>>,
        // Map of token ID to its transaction amount/price
        transaction_amounts: LegacyMap<u256, u256>,
        // Map of token ID to its sold status
        sold_flags: LegacyMap<u256, bool>
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        TransactionRecorded: TransactionRecorded
    }

    #[constructor]
    fn constructor(ref self: ContractState) {
        // Initialize contract if needed
    }

    #[abi(embed_v0)]
    impl TransactionModuleImpl of super::ITransactionModule<ContractState> {
        fn record_transaction(ref self: ContractState, token_id: u256, amount: u256) {
            // Verify amount is not zero
            assert(amount > 0, 'Amount must be greater than 0');
            
            // Get caller address for verification
            let caller = get_caller_address();
            
            // Check if token is already sold
            let is_sold = self.sold_flags.read(token_id);
            assert(!is_sold, 'Token already sold');
            
            // Record the transaction
            self.sold_flags.write(token_id, true);
            self.transaction_amounts.write(token_id, amount);
            
            // Update user's purchase history
            let mut user_purchases = self.purchases.read(caller);
            user_purchases.append(token_id);
            self.purchases.write(caller, user_purchases);
            
            // Emit event
            self.emit(TransactionRecorded { 
                buyer: caller, 
                token_id: token_id, 
                amount: amount 
            });
        }

        fn get_user_purchases(self: @ContractState, user: ContractAddress) -> Array<u256> {
            self.purchases.read(user)
        }

        fn get_token_price(self: @ContractState, token_id: u256) -> u256 {
            self.transaction_amounts.read(token_id)
        }

        fn is_token_sold(self: @ContractState, token_id: u256) -> bool {
            self.sold_flags.read(token_id)
        }
    }
}
