use starknet::ContractAddress;

#[starknet::interface]
pub trait IRoyaltyStandard<TContractState> {
    /// Returns the royalty receiver and amount for a given token and sale price
    /// @param token_id The NFT token ID
    /// @param sale_price The sale price of the NFT
    /// @return (receiver, royalty_amount) Tuple of recipient address and royalty amount
    fn royalty_info(
        self: @TContractState,
        token_id: u256,
        sale_price: u256
    ) -> (ContractAddress, u256);
    
    /// Interface detection (similar to EIP-165)
    /// @param interface_id The interface identifier
    /// @return bool True if the interface is supported
    fn supports_interface(
        self: @TContractState,
        interface_id: felt252
    ) -> bool;
}


#[starknet::component]
mod RoyaltyComponent {
    use starknet::ContractAddress;
    use core::traits::Into;
    use starknet::storage::{StorageMapReadAccess, StorageMapWriteAccess, StoragePointerWriteAccess, Map};


    #[storage]
    struct Storage {
        // Per-token royalty configuration
        royalty_receivers: Map<u256, ContractAddress>,
        royalty_basis_points: Map<u256, u64>,

        // Default royalty configuration
        default_receiver: ContractAddress,
        default_basis_points: u64,
        
        // Tracks supported interfaces (for EIP-165-like support)
        supported_interfaces: Map<felt252, bool>
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        RoyaltyInfoUpdated: RoyaltyInfoUpdated,
        DefaultRoyaltyUpdated: DefaultRoyaltyUpdated
    }

    #[derive(Drop, starknet::Event)]
    struct RoyaltyInfoUpdated {
        token_id: u256,
        receiver: ContractAddress,
        basis_points: u64
    }

    #[derive(Drop, starknet::Event)]
    struct DefaultRoyaltyUpdated {
        receiver: ContractAddress,
        basis_points: u64
    }

    // Computed as pedersen("royalty_info(u256,u256)")[0:4]
    const ROYALTY_INTERFACE_ID: felt252 = 0x2a55205a;

    #[embeddable_as(IRoyaltyStandard)]
    pub impl RoyaltyComponentImpl<
        TContractState, +HasComponent<TContractState>
    > of super::IRoyaltyStandard<ComponentState<TContractState>> {
       
        fn royalty_info(
            self: @ComponentState<TContractState>,
            token_id: u256,
            sale_price: u256
        ) -> (ContractAddress, u256) {
            // Get receiver (token-specific or default)
            let receiver = self.royalty_receivers.read(token_id);
    
            // Get basis points (token-specific or default)
            let bps = self.royalty_basis_points.read(token_id);
    
            // Calculate royalty (price * bps / 10000)
            let royalty = sale_price * bps.into() / 10000;
            
            (receiver, royalty)
        }

        fn supports_interface(
            self: @ComponentState<TContractState>,
            interface_id: felt252
        ) -> bool {
            self.supported_interfaces.read(interface_id)
        }
    }

    #[generate_trait]
    pub impl InternalImpl<
        TContractState, +HasComponent<TContractState>
    > of InternalTrait<TContractState> {
        fn initializer(ref self: ComponentState<TContractState>) {
            self.supported_interfaces.write(ROYALTY_INTERFACE_ID, true);
        }
    }

    #[generate_trait]
    pub impl AdminImpl<
        TContractState, +HasComponent<TContractState>
    > of AdminTrait<TContractState> {
        fn set_token_royalty(
            ref self: ComponentState<TContractState>,
            token_id: u256,
            receiver: ContractAddress,
            basis_points: u64
        ) {
            assert!(basis_points <= 10000, "Basis points > 10000");
            
            self.royalty_receivers.write(token_id, receiver);
            self.royalty_basis_points.write(token_id, basis_points);

            self.emit(RoyaltyInfoUpdated {
                token_id,
                receiver,
                basis_points
            });
        }

        fn set_default_royalty(
            ref self: ComponentState<TContractState>,
            receiver: ContractAddress,
            basis_points: u64
        ) {
            assert!(basis_points <= 10000, "Basis points > 10000");

            self.default_receiver.write(receiver);
            self.default_basis_points.write(basis_points);

            self.emit(DefaultRoyaltyUpdated {
                receiver,
                basis_points
            });
        }
    }
}