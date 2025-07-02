// SPDX-License-Identifier: MIT
// Example: NFT Marketplace using ReentrancyGuard

%lang starknet

from contracts.security.reentrancy_guard import non_reentrant

@storage_var
func owner() -> felt252 {}

@external
@non_reentrant
func buy_nft(token_id: felt252) {
    // ... NFT purchase logic ...
    return ();
}

@external
@non_reentrant
func batch_buy(token_ids: Array<felt252>) {
    // ... Batch purchase logic ...
    return ();
}
