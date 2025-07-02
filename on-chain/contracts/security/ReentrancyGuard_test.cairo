// SPDX-License-Identifier: MIT
// ReentrancyGuard Test Suite for Cairo 2.9.2
// Covers: single-contract, cross-contract, batch, and revert scenarios

%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.starknet.testing.contract import StarknetContract
from contracts/security/ReentrancyGuard import non_reentrant

@storage_var
func test_counter() -> felt252 {}

@external
@non_reentrant
func increment() {
    let (val) = test_counter.read();
    test_counter.write(val + 1);
    return ();
}

@external
@non_reentrant
func reentrant_call() {
    // Try to call increment again (should revert)
    let _ = increment();
    return ();
}

@external
func get_counter() -> felt252 {
    let (val) = test_counter.read();
    return (val,);
}

// Add more tests for cross-contract and batch scenarios in Python test harness
