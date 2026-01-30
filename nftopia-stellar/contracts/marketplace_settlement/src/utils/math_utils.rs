use crate::error::SettlementError;

pub fn checked_add(a: i128, b: i128) -> Result<i128, SettlementError> {
    a.checked_add(b).ok_or(SettlementError::Overflow)
}

pub fn checked_sub(a: i128, b: i128) -> Result<i128, SettlementError> {
    a.checked_sub(b).ok_or(SettlementError::Overflow)
}

pub fn checked_mul(a: i128, b: i128) -> Result<i128, SettlementError> {
    a.checked_mul(b).ok_or(SettlementError::Overflow)
}

pub fn mul_bps(amount: i128, bps: u32) -> Result<i128, SettlementError> {
    let numerator = checked_mul(amount, bps as i128)?;
    Ok(numerator / 10_000)
}
