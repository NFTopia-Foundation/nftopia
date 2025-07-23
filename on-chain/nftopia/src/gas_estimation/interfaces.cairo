
#[starknet::interface]
pub trait GasEstimatorInterface<TContractState> {
    fn estimate_auction_bid(
        self: @TContractState,
        nft_id: felt252,
        bid_amount: u128
    ) -> (u128, u128);

    fn estimate_batch_purchase(
        self: @TContractState,
        token_ids: Span<felt252>,
        prices: Span<u128>
    ) -> (u128, u128);

    fn estimate_royalty_payment(
        self: @TContractState,
        token_id: felt252,
        sale_price: u128
    ) -> (u128, u128);
}





// #[starknet::interface]
// pub trait IGasEstimator<TContractState> {
//     fn estimate_auction_bid(self: @TContractState, nft_id: felt252, bid_amount: u128) -> (u128, u128);
//     fn estimate_batch_purchase(self: @TContractState, token_ids: Span<felt252>, prices: Span<u128>) -> (u128, u128);
//     fn estimate_royalty_payment(self: @TContractState, token_id: felt252, sale_price: u128) -> (u128, u128);
// }




// #[starknet::interface]
// pub trait IGasEstimator<TContractState> {
//     fn estimate_auction_bid(
//         self: @TContractState,
//         nft_id: felt252,
//         bid_amount: u128
//     ) -> (u128, u128); // (wei_estimate, strk_estimate)

//     fn estimate_batch_purchase(
//         self: @TContractState,
//         token_ids: Span<felt252>,
//         prices: Span<u128>
//     ) -> (u128, u128);

//     fn estimate_royalty_payment(
//         self: @TContractState,
//         token_id: felt252,
//         sale_price: u128
//     ) -> (u128, u128);
// }