// SPDX-License-Identifier: MIT
// ReentrancyGuard Test Contract for Cairo v2.9.2
// Place this in on-chain/nftopia/src/contracts/

%lang starknet

from contracts/ReentrancyGuard import non_reentrant

@storage_var
func test_counter() -> felt252 {}

@external
@non_reentrant
func increment() {
    let val = test_counter.read();
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
    let val = test_counter.read();
    return val;
}

// Add more tests for cross-contract and batch scenarios in Cairo or Python harness
