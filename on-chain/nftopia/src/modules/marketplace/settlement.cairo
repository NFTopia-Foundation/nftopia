use starknet::ContractAddress;

// Define the interface trait outside the contract module
#[starknet::interface]
pub trait IMarketplaceSettlement<TContractState> {
    fn distribute_payment(
        ref self: TContractState,
        token_id: u256,
        sale_price: u256,
        seller: ContractAddress,
        nft_contract: ContractAddress
    );
    fn get_payment_token(self: @TContractState) -> ContractAddress;
    fn get_marketplace_owner(self: @TContractState) -> ContractAddress;
}

#[starknet::contract]
pub mod MarketplaceSettlement {
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use core::num::traits::Zero;

    // Define a simple ERC20 interface for token transfers
    #[starknet::interface]
    trait IERC20<TContractState> {
        fn transfer_from(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
        fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    }

    // Define royalty interface
    #[starknet::interface]
    trait IRoyaltyStandard<TContractState> {
        fn royalty_info(self: @TContractState, token_id: u256, sale_price: u256) -> (ContractAddress, u256);
    }

    #[storage]
    struct Storage {
        payment_token: ContractAddress,
        marketplace_owner: ContractAddress,
        // Add reentrancy guard storage
        reentrancy_guard: bool,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        PaymentDistributed: PaymentDistributed,
    }

    #[derive(Drop, starknet::Event)]
    struct PaymentDistributed {
        #[key]
        token_id: u256,
        #[key]
        seller: ContractAddress,
        #[key]
        nft_contract: ContractAddress,
        sale_price: u256,
        royalty_amount: u256,
        royalty_receiver: ContractAddress,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        payment_token: ContractAddress,
        marketplace_owner: ContractAddress
    ) {
        self.payment_token.write(payment_token);
        self.marketplace_owner.write(marketplace_owner);
        self.reentrancy_guard.write(false);
    }

    #[abi(embed_v0)]
    pub impl MarketplaceSettlementImpl of super::IMarketplaceSettlement<ContractState> {
        fn distribute_payment(
            ref self: ContractState,
            token_id: u256,
            sale_price: u256,
            seller: ContractAddress,
            nft_contract: ContractAddress
        ) {
            // Reentrancy protection
            self._start_reentrancy_guard();
            
            // Validate input parameters
            self._validate_parties(seller, nft_contract);
            self._validate_sale_price(sale_price);
            
            let royalty = IRoyaltyStandardDispatcher { contract_address: nft_contract };
            let (receiver, amount) = royalty.royalty_info(token_id, sale_price);
            
            let payment_token = self.payment_token.read();
            let token = IERC20Dispatcher { contract_address: payment_token };
            
            // Transfer royalty if amount > 0
            if !amount.is_zero() {
                token.transfer_from(get_caller_address(), receiver, amount);
            }
            
            // Calculate seller amount (remaining after royalty)
            let seller_amount = sale_price - amount;
            
            // Transfer to seller
            if !seller_amount.is_zero() {
                token.transfer_from(get_caller_address(), seller, seller_amount);
            }

            // Emit event
            self.emit(PaymentDistributed {
                token_id,
                seller,
                nft_contract,
                sale_price,
                royalty_amount: amount,
                royalty_receiver: receiver,
            });

            // End reentrancy protection
            self._end_reentrancy_guard();
        }

        fn get_payment_token(self: @ContractState) -> ContractAddress {
            self.payment_token.read()
        }

        fn get_marketplace_owner(self: @ContractState) -> ContractAddress {
            self.marketplace_owner.read()
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _validate_parties(
            self: @ContractState,
            seller: ContractAddress,
            nft_contract: ContractAddress
        ) {
            // Ensure seller is not zero address
            assert!(!seller.is_zero(), "Invalid seller address");
            
            // Ensure NFT contract is not zero address
            assert!(!nft_contract.is_zero(), "Invalid NFT contract address");
            
            // Additional validation: ensure seller is not the same as caller (marketplace)
            let caller = get_caller_address();
            assert!(seller != caller, "Seller cannot be the marketplace");
        }

        fn _validate_sale_price(self: @ContractState, sale_price: u256) {
            assert!(!sale_price.is_zero(), "Sale price must be greater than zero");
        }

        fn _start_reentrancy_guard(ref self: ContractState) {
            let guard_status = self.reentrancy_guard.read();
            assert!(!guard_status, "Reentrancy guard: reentrant call");
            self.reentrancy_guard.write(true);
        }

        fn _end_reentrancy_guard(ref self: ContractState) {
            self.reentrancy_guard.write(false);
        }
    }
}