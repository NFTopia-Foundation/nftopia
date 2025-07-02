# Gas Benchmark for ReentrancyGuard

import pytest
from starkware.starknet.testing.starknet import Starknet

@pytest.mark.asyncio
async def test_gas_cost_reentrancy_guard():
    starknet = await Starknet.empty()
    guard = await starknet.deploy(source="contracts/security/reentrancy_guard.cairo")
    # Measure gas for a single guard check
    exec_info = await guard._assert_non_reentrant().invoke()
    gas_used = exec_info.call_info.execution_resources.n_steps
    print(f"Gas used for guard check: {gas_used}")
    assert gas_used < 5000, f"Gas cost too high: {gas_used}"
