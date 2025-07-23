#[event]
fn TransactionSponsored(
    user: ContractAddress,
    token: ContractAddress,
    amount: u256
) {}

#[event]
fn RateUpdated(
    token: ContractAddress,
    new_rate: u256
) {}

#[event]
fn FeesWithdrawn(
    token: ContractAddress,
    amount: u256,
    recipient: ContractAddress
) {}