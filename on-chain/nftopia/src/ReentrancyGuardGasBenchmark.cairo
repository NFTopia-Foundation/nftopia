// SPDX-License-Identifier: MIT
// Gas Benchmark for ReentrancyGuard (Cairo v2.9.2)
// This contract is for on-chain benchmarking of the guard's gas usage.

%lang starknet

from src/ReentrancyGuard import _assert_non_reentrant

@external
func benchmark_guard() -> felt252 {
    // Call the guard check and return a dummy value
    _assert_non_reentrant();
    return (1,);
}

// To measure gas, deploy and call benchmark_guard, then check the transaction's resource usage.
