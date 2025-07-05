/// Module for handling NFT transaction recording and querying
/// Includes purchase history tracking, price recording, and ownership status management

/// Event emitted when an NFT transaction is recorded
use crate::modules::marketplace::settlement::IMarketplaceSettlementDispatcher;


#[derive(Drop, starknet::Event)]
pub struct TransactionRecorded {
    pub buyer: starknet::ContractAddress,
    pub token_id: u256,
    pub amount: u256,
}


#[external(v0)]
fn complete_sale(
    ref self: ContractState,
    token_id: u256,
    price: u256,
    seller: ContractAddress
) {
    let settlement = IMarketplaceSettlementDispatcher { 
        contract_address: self.marketplace_address.read() 
    };
    settlement.distribute_payment(token_id, price, seller, self.nft_address.read());
}

/// Interface for the Transaction Module
use starknet::ContractAddress;

#[starknet::interface]
pub trait ITransactionModule<TContractState> {
    fn record_transaction(ref self: TContractState, token_id: u256, amount: u256);
    fn has_user_purchased(self: @TContractState, user: ContractAddress, token_id: u256) -> bool;
    fn get_token_price(self: @TContractState, token_id: u256) -> u256;
    fn is_token_sold(self: @TContractState, token_id: u256) -> bool;
}

/// Implementation of the Transaction Module
#[starknet::contract]
#[feature("deprecated_legacy_map")]
pub mod TransactionModule {
    use starknet::storage::StorageMapWriteAccess;
    use starknet::storage::StorageMapReadAccess;
    use starknet::{ContractAddress, get_caller_address};
    use core::num::traits::Zero;
    use core::traits::Into;
    use core::traits::TryInto;

    #[derive(Drop, starknet::Event)]
    struct TransactionRecorded {
        buyer: ContractAddress,
        token_id: u256,
        amount: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        TransactionRecorded: super::TransactionRecorded,
    }

    #[storage]
    struct Storage {
        user_purchases: LegacyMap<(felt252, felt252), felt252>,
        token_prices: LegacyMap<felt252, felt252>,
        token_sold_status: LegacyMap<felt252, felt252>,
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn get_purchase_key(user: ContractAddress, token_id: u256) -> (felt252, felt252) {
            let user_felt: felt252 = user.into();
            let token_felt: felt252 = token_id.try_into().unwrap();
            (user_felt, token_felt)
        }
    }

    #[abi(embed_v0)]
    impl TransactionModuleImpl of super::ITransactionModule<ContractState> {
        fn record_transaction(ref self: ContractState, token_id: u256, amount: u256) {
            // Validate amount
            assert(!amount.is_zero(), 'Amount must be greater than 0');

            // Check if token is already sold
            let is_sold = self.is_token_sold(token_id);
            assert(!is_sold, 'Token already sold');

            // Record the transaction
            let caller = get_caller_address();

            // Mark token as sold
            let token_felt: felt252 = token_id.try_into().unwrap();
            self.token_sold_status.write(token_felt, 1);

            // Record price
            let amount_felt: felt252 = amount.try_into().unwrap();
            self.token_prices.write(token_felt, amount_felt);

            // Record purchase for user
            let purchase_key = InternalImpl::get_purchase_key(caller, token_id);
            self.user_purchases.write(purchase_key, 1);

            // Emit event
            self
                .emit(
                    Event::TransactionRecorded(
                        super::TransactionRecorded { buyer: caller, token_id, amount },
                    ),
                );
        }

        fn has_user_purchased(self: @ContractState, user: ContractAddress, token_id: u256) -> bool {
            let purchase_key = InternalImpl::get_purchase_key(user, token_id);
            let purchase_value = self.user_purchases.read(purchase_key);
            purchase_value == 1
        }

        fn get_token_price(self: @ContractState, token_id: u256) -> u256 {
            let token_felt: felt252 = token_id.try_into().unwrap();
            let price_felt = self.token_prices.read(token_felt);
            price_felt.into()
        }

        fn is_token_sold(self: @ContractState, token_id: u256) -> bool {
            let token_felt: felt252 = token_id.try_into().unwrap();
            let sold_status = self.token_sold_status.read(token_felt);
            sold_status == 1
        }
    }
}
