#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Bytes, Env, String, Vec};

mod access_control;
mod error;
mod events;
mod interface;
mod metadata;
mod royalty;
mod storage;
mod token;
mod transfer;
mod utils;

use access_control::Role;
use error::ContractError;
use token::{CollectionConfig, RoyaltyInfo, SaleRecord, TokenAttribute, TokenData};
use token::TransferRecord;

#[contract]
pub struct NFTContract;

#[contractimpl]
impl NFTContract {
    pub fn initialize(
        env: Env,
        owner: Address,
        name: String,
        symbol: String,
        base_uri: String,
        max_supply: Option<u64>,
        mint_price: Option<i128>,
        royalty_recipient: Address,
        royalty_percentage: u32,
    ) -> Result<(), ContractError> {
        if storage::is_initialized(&env) {
            return Err(ContractError::AlreadyInitialized);
        }
        owner.require_auth();
        if royalty_percentage > 10_000 {
            return Err(ContractError::RoyaltyTooHigh);
        }
        let config = CollectionConfig {
            name,
            symbol,
            base_uri,
            max_supply,
            mint_price,
            is_revealed: false,
            royalty_default: RoyaltyInfo {
                recipient: royalty_recipient,
                percentage: royalty_percentage,
            },
            metadata_is_frozen: false,
            whitelist_enabled: false,
            reveal_time: None,
        };
        storage::write_config(&env, &config);
        storage::write_owner(&env, &owner);
        storage::set_paused(&env, false, false);
        env.storage()
            .persistent()
            .set(&storage::DataKey::Role(Role::Admin, owner.clone()), &true);
        env.storage()
            .persistent()
            .set(&storage::DataKey::Role(Role::Minter, owner.clone()), &true);
        env.storage()
            .persistent()
            .set(&storage::DataKey::Role(Role::Burner, owner.clone()), &true);
        env.storage()
            .persistent()
            .set(&storage::DataKey::Role(Role::MetadataUpdater, owner), &true);
        Ok(())
    }

    pub fn mint(
        env: Env,
        to: Address,
        metadata_uri: String,
        attributes: Vec<TokenAttribute>,
        royalty_override: Option<RoyaltyInfo>,
    ) -> Result<u64, ContractError> {
        mint_internal(&env, to, metadata_uri, attributes, royalty_override)
    }

    pub fn batch_mint(
        env: Env,
        recipients: Vec<Address>,
        metadata_uris: Vec<String>,
        attributes: Vec<Vec<TokenAttribute>>,
    ) -> Result<Vec<u64>, ContractError> {
        if recipients.len() != metadata_uris.len() || recipients.len() != attributes.len() {
            return Err(ContractError::ArrayLengthMismatch);
        }

        let mut minted = Vec::new(&env);
        let count = recipients.len();
        let mut i = 0;
        while i < count {
            let token_id = mint_internal(
                &env,
                recipients.get_unchecked(i).clone(),
                metadata_uris.get_unchecked(i).clone(),
                attributes.get_unchecked(i).clone(),
                None,
            )?;
            minted.push_back(token_id);
            i += 1;
        }
        Ok(minted)
    }

    pub fn burn(env: Env, token_id: u64, confirm: bool) -> Result<(), ContractError> {
        if !confirm {
            return Err(ContractError::ConfirmRequired);
        }
        let token = storage::read_token(&env, token_id)?;
        token.owner.require_auth();

        let owner = token.owner.clone();
        let balance = storage::read_balance(&env, &owner);
        storage::write_balance(&env, &owner, balance.saturating_sub(1));
        storage::delete_token(&env, token_id);
        let total_supply = storage::read_total_supply(&env).saturating_sub(1);
        storage::write_total_supply(&env, total_supply);
        events::emit_burn(&env, &owner, token_id);
        Ok(())
    }

    pub fn transfer(env: Env, from: Address, to: Address, token_id: u64) -> Result<(), ContractError> {
        transfer::transfer(&env, from, to, token_id, None, false)
    }

    pub fn safe_transfer_from(
        env: Env,
        from: Address,
        to: Address,
        token_id: u64,
        data: Option<Bytes>,
    ) -> Result<(), ContractError> {
        transfer::transfer(&env, from, to, token_id, data, true)
    }

    pub fn batch_transfer(
        env: Env,
        from: Address,
        to: Address,
        token_ids: Vec<u64>,
    ) -> Result<(), ContractError> {
        let count = token_ids.len();
        let mut i = 0;
        while i < count {
            transfer::transfer(
                &env,
                from.clone(),
                to.clone(),
                token_ids.get_unchecked(i),
                None,
                false,
            )?;
            i += 1;
        }
        Ok(())
    }

    pub fn owner_of(env: Env, token_id: u64) -> Result<Address, ContractError> {
        Ok(storage::read_token(&env, token_id)?.owner)
    }

    pub fn name(env: Env) -> Result<String, ContractError> {
        Ok(storage::read_config(&env)?.name)
    }

    pub fn symbol(env: Env) -> Result<String, ContractError> {
        Ok(storage::read_config(&env)?.symbol)
    }

    pub fn total_supply(env: Env) -> Result<u64, ContractError> {
        let _ = storage::read_owner(&env)?;
        Ok(storage::read_total_supply(&env))
    }

    pub fn balance_of(env: Env, owner: Address) -> Result<u64, ContractError> {
        let _ = storage::read_owner(&env)?;
        Ok(storage::read_balance(&env, &owner))
    }

    pub fn approve(env: Env, to: Address, token_id: u64) -> Result<(), ContractError> {
        let token = storage::read_token(&env, token_id)?;
        token.owner.require_auth();
        storage::set_approval(&env, token_id, Some(to.clone()))?;
        events::emit_approval(&env, &token.owner, &Some(to), token_id);
        Ok(())
    }

    pub fn set_approval_for_all(
        env: Env,
        owner: Address,
        operator: Address,
        approved: bool,
    ) -> Result<(), ContractError> {
        owner.require_auth();
        storage::set_operator_approval(&env, &owner, &operator, approved);
        events::emit_approval_for_all(&env, &owner, &operator, approved);
        Ok(())
    }

    pub fn get_approved(env: Env, token_id: u64) -> Result<Option<Address>, ContractError> {
        Ok(storage::read_token(&env, token_id)?.approved)
    }

    pub fn is_approved_for_all(
        env: Env,
        owner: Address,
        operator: Address,
    ) -> Result<bool, ContractError> {
        let _ = storage::read_owner(&env)?;
        Ok(storage::is_operator_approved(&env, &owner, &operator))
    }

    pub fn token_uri(env: Env, token_id: u64) -> Result<String, ContractError> {
        metadata::token_uri(&env, token_id)
    }

    pub fn token_metadata(env: Env, token_id: u64) -> Result<TokenData, ContractError> {
        metadata::token_metadata(&env, token_id)
    }

    pub fn set_token_uri(env: Env, token_id: u64, uri: String) -> Result<(), ContractError> {
        metadata::set_token_uri(&env, token_id, uri)
    }

    pub fn set_base_uri(env: Env, uri: String) -> Result<(), ContractError> {
        metadata::set_base_uri(&env, uri)
    }

    pub fn freeze_metadata(env: Env) -> Result<(), ContractError> {
        metadata::freeze_metadata(&env)
    }

    pub fn set_default_royalty(
        env: Env,
        recipient: Address,
        percentage: u32,
    ) -> Result<(), ContractError> {
        royalty::set_default_royalty(&env, recipient, percentage)
    }

    pub fn set_royalty_info(
        env: Env,
        token_id: u64,
        recipient: Address,
        percentage: u32,
    ) -> Result<(), ContractError> {
        royalty::set_token_royalty(&env, token_id, recipient, percentage)
    }

    pub fn get_royalty_info(
        env: Env,
        token_id: u64,
        sale_price: i128,
    ) -> Result<(Address, i128), ContractError> {
        royalty::get_royalty_info(&env, token_id, sale_price)
    }

    pub fn supports_interface(env: Env, interface_id: soroban_sdk::BytesN<32>) -> bool {
        interface_id == interface::nft_interface_id(&env)
            || interface_id == interface::royalty_interface_id(&env)
            || interface_id == interface::metadata_interface_id(&env)
            || interface_id == interface::access_control_interface_id(&env)
    }

    pub fn set_pause(env: Env, mint_paused: bool, transfer_paused: bool) -> Result<(), ContractError> {
        let _ = access_control::require_admin(&env)?;
        storage::set_paused(&env, mint_paused, transfer_paused);
        Ok(())
    }

    pub fn set_whitelist_enabled(env: Env, enabled: bool) -> Result<(), ContractError> {
        let _ = access_control::require_admin(&env)?;
        let mut config = storage::read_config(&env)?;
        config.whitelist_enabled = enabled;
        storage::write_config(&env, &config);
        Ok(())
    }

    pub fn set_whitelist(
        env: Env,
        account: Address,
        enabled: bool,
    ) -> Result<(), ContractError> {
        let _ = access_control::require_admin(&env)?;
        storage::set_whitelisted(&env, &account, enabled);
        Ok(())
    }

    pub fn set_reveal_time(env: Env, reveal_time: Option<u64>) -> Result<(), ContractError> {
        metadata::set_reveal_time(&env, reveal_time)
    }

    pub fn set_revealed(env: Env, revealed: bool) -> Result<(), ContractError> {
        metadata::set_revealed(&env, revealed)
    }

    pub fn set_role(
        env: Env,
        role: Role,
        account: Address,
        enabled: bool,
    ) -> Result<(), ContractError> {
        access_control::set_role(&env, role, account, enabled)
    }

    pub fn has_role(env: Env, role: Role, account: Address) -> Result<bool, ContractError> {
        storage::has_role(&env, role, &account)
    }

    pub fn set_mint_price(env: Env, price: Option<i128>) -> Result<(), ContractError> {
        let _ = access_control::require_admin(&env)?;
        let mut config = storage::read_config(&env)?;
        config.mint_price = price;
        storage::write_config(&env, &config);
        Ok(())
    }

    pub fn record_secondary_sale(
        env: Env,
        token_id: u64,
        seller: Address,
        buyer: Address,
        price: i128,
    ) -> Result<(), ContractError> {
        let _ = royalty::require_marketplace(&env)?;
        let _ = storage::read_token(&env, token_id)?;
        if price < 0 {
            return Err(ContractError::InvalidInput);
        }
        let record = SaleRecord {
            seller,
            buyer,
            price,
            timestamp: env.ledger().timestamp(),
        };
        storage::append_history(&env, token_id, record);
        Ok(())
    }

    pub fn get_sale_history(env: Env, token_id: u64) -> Result<Vec<SaleRecord>, ContractError> {
        let _ = storage::read_token(&env, token_id)?;
        Ok(storage::read_history(&env, token_id))
    }

    pub fn get_transfer_history(
        env: Env,
        token_id: u64,
    ) -> Result<Vec<TransferRecord>, ContractError> {
        let _ = storage::read_token(&env, token_id)?;
        Ok(storage::read_transfer_history(&env, token_id))
    }
}

fn mint_internal(
    env: &Env,
    to: Address,
    metadata_uri: String,
    attributes: Vec<TokenAttribute>,
    royalty_override: Option<RoyaltyInfo>,
) -> Result<u64, ContractError> {
    if storage::is_mint_paused(env) {
        return Err(ContractError::MintPaused);
    }
    let owner = storage::read_owner(env)?;
    owner.require_auth();

    let config = storage::read_config(env)?;
    if config.whitelist_enabled && !storage::is_whitelisted(env, &to) {
        return Err(ContractError::WhitelistRequired);
    }

    let total_supply = storage::read_total_supply(env);
    if let Some(max_supply) = config.max_supply {
        if total_supply >= max_supply {
            return Err(ContractError::MaxSupplyReached);
        }
    }

    let token_id = storage::read_next_token_id(env);
    storage::write_next_token_id(env, token_id + 1);

    let royalty = royalty_override.unwrap_or_else(|| config.royalty_default.clone());
    if royalty.percentage > 10_000 {
        return Err(ContractError::RoyaltyTooHigh);
    }

    let token = TokenData {
        id: token_id,
        owner: to.clone(),
        approved: None,
        metadata_uri,
        created_at: env.ledger().timestamp(),
        creator: owner,
        royalty_percentage: royalty.percentage,
        royalty_recipient: royalty.recipient,
        attributes,
        edition_number: None,
        total_editions: None,
    };

    storage::write_token(env, &token);
    let balance = storage::read_balance(env, &to);
    storage::write_balance(env, &to, balance.saturating_add(1));
    storage::write_total_supply(env, total_supply.saturating_add(1));

    events::emit_mint(env, &to, token_id);
    Ok(token_id)
}
