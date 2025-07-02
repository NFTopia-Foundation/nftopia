// SPDX-License-Identifier: MIT
// OnlyDust Starknet ReentrancyGuard (Cairo 1.0)

@contract_interface
namespace IReentrancyGuard {
    func _assert_non_reentrant() -> ();
}

@storage_var
func __locked() -> felt252 {}

@event
func ReentrancyGuardError(reason: felt252) {}

@modifier
func non_reentrant() {
    let (locked) = __locked.read();
    if locked != 0 {
        ReentrancyGuardError('REENTRANCY_GUARD: reentrant call');
        with_attr error('REENTRANCY_GUARD: reentrant call') {
            return ();
        }
    }
    __locked.write(1);
    let res = yield ();
    __locked.write(0);
    return res;
}

@external
func _assert_non_reentrant() {
    let (locked) = __locked.read();
    if locked != 0 {
        ReentrancyGuardError('REENTRANCY_GUARD: reentrant call');
        with_attr error('REENTRANCY_GUARD: reentrant call') {
            return ();
        }
    }
    return ();
}
