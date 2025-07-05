
#[starknet::contract]
mod RoyaltyLogic {
    use crate::modules::royalty::interfaces::{
        IRoyaltyStandardDispatcher, 
        IRoyaltyStandardDispatcherTrait
    };
    use starknet::ContractAddress;
    use integer::u256_from_felt252;
    use integer::u256_into_felt252;

    const MAX_BPS: u16 = 10000; // 100% in basis points

    #[external(v0)]
    fn royalty_info(
        self: @ContractState, 
        token_id: u256, 
        sale_price: u256
    ) -> (ContractAddress, u256) {
        let (receiver, bps) = _get_royalty_info(self, token_id);
        let amount = (sale_price * u256_from_felt252(bps.into())) / u256_from_felt252(MAX_BPS.into());
        (receiver, amount)
    }

    #[external(v0)]
    fn set_default_royalty(
        ref self: ContractState,
        receiver: ContractAddress,
        fee_basis_points: u16
    ) {
        assert(fee_basis_points <= MAX_BPS, 'INVALID_BPS');
        self.default_receiver.write(receiver);
        self.default_fee_bps.write(fee_basis_points);
        RoyaltyEvents::emit_default_royalty_updated(receiver, fee_basis_points);
    }

    #[external(v0)]
    fn set_token_royalty(
        ref self: ContractState,
        token_id: u256,
        receiver: ContractAddress,
        fee_basis_points: u16
    ) {
        assert(fee_basis_points <= MAX_BPS, 'INVALID_BPS');
        self.token_royalty_receiver.write(token_id, receiver);
        self.token_royalty_bps.write(token_id, fee_basis_points);
        RoyaltyEvents::emit_token_royalty_updated(token_id, receiver, fee_basis_points);
    }

    // Internal helper function
    fn _get_royalty_info(
        self: @ContractState,
        token_id: u256
    ) -> (ContractAddress, u16) {
        let token_receiver = self.token_royalty_receiver.read(token_id);
        let token_bps = self.token_royalty_bps.read(token_id);
        
        if token_receiver.is_zero() == false {
            return (token_receiver, token_bps);
        }
        (self.default_receiver.read(), self.default_fee_bps.read())
    }
}