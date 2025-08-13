use starknet::ContractAddress;
use core::traits::Into;

#[starknet::interface]
pub trait IPaymaster<TContractState> {
    // Core functions
    fn sponsor_transaction(ref self: TContractState, user: ContractAddress, token: ContractAddress, max_fee: u256) -> bool;
    fn update_rate(ref self: TContractState, token: ContractAddress, new_rate: u256);
    fn withdraw_fees(ref self: TContractState, token: ContractAddress, amount: u256, recipient: ContractAddress);
    
    // View functions
    fn get_rate(self: @TContractState, token: ContractAddress) -> u256;
    fn get_balance(self: @TContractState, token: ContractAddress) -> u256;
    fn is_whitelisted(self: @TContractState, user: ContractAddress) -> bool;
}

#[starknet::contract]
pub mod PaymasterContract {
    use super::*;
    use starknet::get_caller_address;
    use core::num::traits::Zero;
    use starknet::storage::{StorageMapReadAccess, StorageMapWriteAccess, StoragePointerWriteAccess, StoragePointerReadAccess, Map};


    // Events
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        TransactionSponsored: TransactionSponsored,
        RateUpdated: RateUpdated,
        FeesWithdrawn: FeesWithdrawn,
        UserWhitelisted: UserWhitelisted,
        UserBlacklisted: UserBlacklisted,
        TokenSupported: TokenSupported,
        TokenDisabled: TokenDisabled
    }

    #[derive(Drop, starknet::Event)]
    struct TransactionSponsored {
        #[key]
        user: ContractAddress,
        token: ContractAddress,
        amount: u256,
        remaining_balance: u256
    }

    #[derive(Drop, starknet::Event)]
    struct RateUpdated {
        #[key]
        token: ContractAddress,
        old_rate: u256,
        new_rate: u256
    }

    #[derive(Drop, starknet::Event)]
    struct FeesWithdrawn {
        #[key]
        token: ContractAddress,
        amount: u256,
        recipient: ContractAddress,
        remaining_balance: u256
    }

    #[derive(Drop, starknet::Event)]
    struct UserWhitelisted {
        #[key]
        user: ContractAddress,
        added_by: ContractAddress
    }

    #[derive(Drop, starknet::Event)]
    struct UserBlacklisted {
        #[key]
        user: ContractAddress,
        removed_by: ContractAddress
    }

    #[derive(Drop, starknet::Event)]
    struct TokenSupported {
        #[key]
        token: ContractAddress,
        initial_rate: u256,
        added_by: ContractAddress
    }

    #[derive(Drop, starknet::Event)]
    struct TokenDisabled {
        #[key]
        token: ContractAddress,
        disabled_by: ContractAddress
    }

    // Storage
    #[storage]
    pub struct Storage {
        // Token management
        supported_tokens: Map<ContractAddress, bool>,
        token_rates: Map<ContractAddress, u256>,
        token_balances: Map<ContractAddress, u256>,
        
        // Access control
        whitelist: Map<ContractAddress, bool>,
        admins: Map<ContractAddress, bool>,
        
        // Statistics
        total_transactions_sponsored: u256,
        total_fees_collected: Map<ContractAddress, u256>
    }

  
    // Implementation
    #[abi(embed_v0)]
    pub impl PaymasterImpl of IPaymaster<ContractState> {
        fn sponsor_transaction(
            ref self: ContractState,
            user: ContractAddress,
            token: ContractAddress,
            max_fee: u256
        ) -> bool {
            self._validate_sponsorship(user, token, max_fee);
            
            let rate = self.token_rates.read(token);
            let cost = max_fee * rate;
            let balance = self.token_balances.read(token);
            
            assert!(balance >= cost, "Insufficient contract balance");
            
            self.token_balances.write(token, balance - cost);
            self.total_transactions_sponsored.write(self.total_transactions_sponsored.read() + 1);
            
            self.emit(TransactionSponsored {
                user,
                token,
                amount: cost,
                remaining_balance: balance - cost
            });
            
            true
        }

        fn update_rate(
            ref self: ContractState,
            token: ContractAddress,
            new_rate: u256
        ) {
            self._only_admin();
            assert!(self.supported_tokens.read(token), "Token not supported");
            
            let old_rate = self.token_rates.read(token);
            self.token_rates.write(token, new_rate);
            
            self.emit(RateUpdated {
                token,
                old_rate,
                new_rate
            });
        }

        fn withdraw_fees(
            ref self: ContractState,
            token: ContractAddress,
            amount: u256,
            recipient: ContractAddress
        ) {
            self._only_admin();
            let balance = self.token_balances.read(token);
            assert!(balance >= amount, "Insufficient balance");
            
            self.token_balances.write(token, balance - amount);
            self.total_fees_collected.write(token, self.total_fees_collected.read(token) + amount);
            
            self.emit(FeesWithdrawn {
                token,
                amount,
                recipient,
                remaining_balance: balance - amount
            });
            
            // In practice, you'd transfer tokens here
        }

        // View functions
        fn get_rate(self: @ContractState, token: ContractAddress) -> u256 {
            self.token_rates.read(token)
        }

        fn get_balance(self: @ContractState, token: ContractAddress) -> u256 {
            self.token_balances.read(token)
        }

        fn is_whitelisted(self: @ContractState, user: ContractAddress) -> bool {
            self.whitelist.read(user)
        }
    }

    // Internal functions
    #[generate_trait]
    pub impl InternalImpl of InternalTrait {
        fn _only_admin(self: @ContractState) {
            let caller = get_caller_address();
            assert!(self.admins.read(caller), "Caller is not admin");
        }

        fn _validate_sponsorship(
            self: @ContractState,
            user: ContractAddress,
            token: ContractAddress,
            max_fee: u256
        ) {
            assert!(!max_fee.is_zero(), "Max fee cannot be zero");
            assert!(self.supported_tokens.read(token), "Token not supported");
            assert!(self.whitelist.read(user), "User not whitelisted");
        }

        fn _support_token(
            ref self: ContractState,
            token: ContractAddress,
            initial_rate: u256
        ) {
            self._only_admin();
            self.supported_tokens.write(token, true);
            self.token_rates.write(token, initial_rate);
            
            self.emit(TokenSupported {
                token,
                initial_rate,
                added_by: get_caller_address()
            });
        }
    }
}