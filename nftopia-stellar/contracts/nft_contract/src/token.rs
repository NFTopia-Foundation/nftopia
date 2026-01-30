use soroban_sdk::{contracttype, Address, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenAttribute {
    pub trait_type: String,
    pub value: String,
    pub display_type: Option<String>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoyaltyInfo {
    pub recipient: Address,
    pub percentage: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenData {
    pub id: u64,
    pub owner: Address,
    pub approved: Option<Address>,
    pub metadata_uri: String,
    pub created_at: u64,
    pub creator: Address,
    pub royalty_percentage: u32,
    pub royalty_recipient: Address,
    pub attributes: Vec<TokenAttribute>,
    pub edition_number: Option<u32>,
    pub total_editions: Option<u32>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CollectionConfig {
    pub name: String,
    pub symbol: String,
    pub base_uri: String,
    pub max_supply: Option<u64>,
    pub mint_price: Option<i128>,
    pub is_revealed: bool,
    pub royalty_default: RoyaltyInfo,
    pub metadata_is_frozen: bool,
    pub whitelist_enabled: bool,
    pub reveal_time: Option<u64>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SaleRecord {
    pub seller: Address,
    pub buyer: Address,
    pub price: i128,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransferRecord {
    pub operator: Address,
    pub from: Address,
    pub to: Address,
    pub timestamp: u64,
}
