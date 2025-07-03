// Swap status enum
#[derive(Drop, starknet::Store, Copy)]
enum SwapStatus {
    Created,
    Completed,
    Cancelled,
    Disputed,
}

// Main Swap struct - using individual storage variables instead of struct
// This avoids the Serde issue with older Cairo versions

// Storage for the escrow contract
#[starknet::contract]
mod EscrowStorage {
    use starknet::contract_address::ContractAddress;
    use starknet::storage::{ Map };


    #[storage]
    struct Storage {
        // Swap tracking
        next_swap_id: u256,
        
        // User data
        user_swaps: Map<ContractAddress, Array<u256>>,
        active_swaps: Array<u256>,
        
        // Contract state
        paused: bool,
        admin: ContractAddress,
        moderator: ContractAddress,
        dispute_period: u64,
        max_swaps_per_user: u32,
        
        // Reentrancy protection
        locked: bool,
        
        // Circuit breaker
        emergency_stop: bool,
        
        // Rate limiting
        user_swap_count: Map<ContractAddress, u32>,
        last_swap_time: Map<ContractAddress, u64>,
        
        // Fees and economics
        platform_fee: u256,
        platform_fee_recipient: ContractAddress,
        
        // Statistics
        total_swaps_created: u256,
        total_swaps_completed: u256,
        total_volume: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        SwapCreated: SwapCreated,
        SwapAccepted: SwapAccepted,
        SwapCancelled: SwapCancelled,
        SwapDisputed: SwapDisputed,
        DisputeResolved: DisputeResolved,
        EmergencyStop: EmergencyStop,
        AdminChanged: AdminChanged,
        ModeratorChanged: ModeratorChanged,
    }

    #[derive(Drop, starknet::Event)]
    struct SwapCreated {
        swap_id: u256,
        creator: ContractAddress,
        nft_contract: ContractAddress,
        nft_id: u256,
        price: u256,
        expiry: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct SwapAccepted {
        swap_id: u256,
        acceptor: ContractAddress,
        accepted_at: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct SwapCancelled {
        swap_id: u256,
        cancelled_by: ContractAddress,
        cancelled_at: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct SwapDisputed {
        swap_id: u256,
        disputed_by: ContractAddress,
        disputed_at: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct DisputeResolved {
        swap_id: u256,
        winner: ContractAddress,
        resolved_at: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct EmergencyStop {
        stopped_by: ContractAddress,
        stopped_at: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct AdminChanged {
        old_admin: ContractAddress,
        new_admin: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct ModeratorChanged {
        old_moderator: ContractAddress,
        new_moderator: ContractAddress,
    }
} 