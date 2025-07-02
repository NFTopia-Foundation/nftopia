# ReentrancyGuard Cairo 1.0 Test Suite

import pytest
from starkware.starknet.testing.starknet import Starknet
from starkware.starknet.testing.contract import StarknetContract

@pytest.mark.asyncio
async def test_single_contract_reentrancy():
    starknet = await Starknet.empty()
    guard = await starknet.deploy(source="contracts/security/reentrancy_guard.cairo")
    # Simulate a contract inheriting the guard and calling a non_reentrant function recursively
    # Should revert on second call
    await guard._assert_non_reentrant().invoke()
    await guard._assert_non_reentrant().invoke()
    # Should revert if called while locked
    await guard.__locked.write(1).invoke()
    try:
        await guard._assert_non_reentrant().invoke()
        assert False, "Should revert on reentrancy"
    except Exception as e:
        assert "REENTRANCY_GUARD" in str(e)

@pytest.mark.asyncio
async def test_cross_contract_callback_attack():
    starknet = await Starknet.empty()
    guard = await starknet.deploy(source="contracts/security/reentrancy_guard.cairo")
    # Simulate cross-contract call: contract A calls B, B calls back to A
    # Both should use the guard and revert on reentrancy
    await guard._assert_non_reentrant().invoke()
    await guard.__locked.write(1).invoke()
    try:
        await guard._assert_non_reentrant().invoke()
        assert False, "Should revert on cross-contract reentrancy"
    except Exception as e:
        assert "REENTRANCY_GUARD" in str(e)

@pytest.mark.asyncio
async def test_batch_transaction_scenarios():
    starknet = await Starknet.empty()
    guard = await starknet.deploy(source="contracts/security/reentrancy_guard.cairo")
    # Simulate batch: multiple guarded calls in one tx
    await guard._assert_non_reentrant().invoke()
    await guard._assert_non_reentrant().invoke()
    # Should not revert if lock is released between calls
    await guard.__locked.write(0).invoke()
    await guard._assert_non_reentrant().invoke()
