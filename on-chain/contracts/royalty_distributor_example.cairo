// SPDX-License-Identifier: MIT
// Example: Royalty Distributor using ReentrancyGuard

%lang starknet

from contracts.security.reentrancy_guard import non_reentrant

@storage_var
func royalty_balance(artist: felt252) -> felt252 {}

@external
@non_reentrant
func distribute_royalty(artist: felt252, amount: felt252) {
    // ... distribution logic ...
    return ();
}
