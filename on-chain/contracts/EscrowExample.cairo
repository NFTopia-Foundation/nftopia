// SPDX-License-Identifier: MIT
// Example: Escrow contract using ReentrancyGuard

%lang starknet
from contracts/security/ReentrancyGuard import non_reentrant

@storage_var
func escrow_balance(user: felt252) -> felt252 {}

@external
@non_reentrant
func deposit() {
    // ... deposit logic ...
    return ();
}

@external
@non_reentrant
func withdraw() {
    // ... withdraw logic ...
    return ();
}
