#![no_std]

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

use soroban_sdk::{contract, contractimpl, Address, Bytes, Env, String, Vec};

use access_control::{has_role, require_owner, require_role, Role};
use error::ContractError;
use events::{emit_approval, emit_approval_for_all, emit_base_uri_update, emit_burn, emit_metadata_update, emit_mint, emit_pause, emit_role_grant, emit_role_revoke, emit_transfer};
use interface::supports_interface_id;
use metadata::{metadata_locked, require_metadata_updater, set_base_uri, set_token_uri, token_metadata, token_uri};
use royalty::{get_royalty_info, set_default_royalty, set_token_royalty};
use storage::{
    add_transfer_record, del_token, get_balance, get_collection_config, get_owner, get_reveal_time,
    get_token, increment_balance, increment_token_count, is_initialized, next_token_id, set_balance,
    set_collection_config, set_initialized, set_mint_paused, set_owner, set_paused, set_reveal_time,
    set_token, set_transfer_paused, set_whitelist_enabled, set_whitelisted, token_count,
};
use token::{CollectionConfig, RoyaltyInfo, TokenAttribute, TokenData};
use transfer::{batch_transfer_internal, is_approved_for_all, owner_of, transfer_internal};
use utils::{require_not_paused, require_token_exists, require_whitelist, validate_royalty_info};

#[contract]
pub struct NftContract;

#[contractimpl]
impl NftContract {
    pub fn init(
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
        if is_initialized(&env) {
            return Err(ContractError::AlreadyInitialized);
        }
        owner.require_auth();
        validate_royalty_info(royalty_percentage)?;

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
        };

        set_owner(&env, owner.clone());
        set_collection_config(&env, config);
        set_initialized(&env, true);

        // Owner gets all roles by default.
        access_control::set_role(&env, Role::Owner, owner.clone(), true);
        access_control::set_role(&env, Role::Admin, owner.clone(), true);
        access_control::set_role(&env, Role::Minter, owner.clone(), true);
        access_control::set_role(&env, Role::Burner, owner.clone(), true);
        access_control::set_role(&env, Role::MetadataUpdater, owner, true);

        Ok(())
    }

    pub fn upgrade(env: Env, new_wasm_hash: soroban_sdk::BytesN<32>) -> Result<(), ContractError> {
        require_role(&env, Role::Owner)?;
        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }

    pub fn name(env: Env) -> Result<String, ContractError> {
        Ok(get_collection_config(&env)?.name)
    }

    pub fn symbol(env: Env) -> Result<String, ContractError> {
        Ok(get_collection_config(&env)?.symbol)
    }

    pub fn get_collection_config(env: Env) -> Result<CollectionConfig, ContractError> {
        get_collection_config(&env)
    }

    pub fn owner(env: Env) -> Result<Address, ContractError> {
        get_owner(&env)
    }

    pub fn transfer_ownership(env: Env, new_owner: Address) -> Result<(), ContractError> {
        require_owner(&env)?;
        new_owner.require_auth();
        set_owner(&env, new_owner);
        Ok(())
    }

    pub fn grant_role(env: Env, role: Role, to: Address) -> Result<(), ContractError> {
        require_role(&env, Role::Owner)?;
        access_control::set_role(&env, role.clone(), to.clone(), true);
        emit_role_grant(&env, role, to);
        Ok(())
    }

    pub fn revoke_role(env: Env, role: Role, from: Address) -> Result<(), ContractError> {
        require_role(&env, Role::Owner)?;
        access_control::set_role(&env, role.clone(), from.clone(), false);
        emit_role_revoke(&env, role, from);
        Ok(())
    }

    pub fn has_role(env: Env, role: Role, addr: Address) -> Result<bool, ContractError> {
        Ok(has_role(&env, role, &addr))
    }

    pub fn set_paused(env: Env, paused: bool) -> Result<(), ContractError> {
        require_role(&env, Role::Admin)?;
        set_paused(&env, paused);
        emit_pause(&env, paused);
        Ok(())
    }

    pub fn set_mint_paused(env: Env, paused: bool) -> Result<(), ContractError> {
        require_role(&env, Role::Admin)?;
        set_mint_paused(&env, paused);
        Ok(())
    }

    pub fn set_transfer_paused(env: Env, paused: bool) -> Result<(), ContractError> {
        require_role(&env, Role::Admin)?;
        set_transfer_paused(&env, paused);
        Ok(())
    }

    pub fn set_whitelist_enabled(env: Env, enabled: bool) -> Result<(), ContractError> {
        require_role(&env, Role::Admin)?;
        set_whitelist_enabled(&env, enabled);
        Ok(())
    }

    pub fn set_whitelisted(env: Env, addr: Address, enabled: bool) -> Result<(), ContractError> {
        require_role(&env, Role::Admin)?;
        set_whitelisted(&env, addr, enabled);
        Ok(())
    }

    pub fn is_whitelisted(env: Env, addr: Address) -> Result<bool, ContractError> {
        Ok(storage::is_whitelisted(&env, &addr))
    }

    pub fn set_reveal_time(env: Env, timestamp: u64) -> Result<(), ContractError> {
        require_role(&env, Role::Admin)?;
        set_reveal_time(&env, timestamp);
        Ok(())
    }

    pub fn reveal(env: Env) -> Result<(), ContractError> {
        require_role(&env, Role::Admin)?;
        let now = env.ledger().timestamp();
        let reveal_time = get_reveal_time(&env)?;
        if now < reveal_time {
            return Err(ContractError::RevealNotReady);
        }
        let mut config = get_collection_config(&env)?;
        config.is_revealed = true;
        set_collection_config(&env, config);
        Ok(())
    }

    pub fn mint(
        env: Env,
        to: Address,
        metadata_uri: String,
        attributes: Vec<TokenAttribute>,
        royalty_override: Option<RoyaltyInfo>,
    ) -> Result<u64, ContractError> {
        require_role(&env, Role::Minter)?;
        require_not_paused(&env, true)?;
        require_whitelist(&env, &to)?;

        let config = get_collection_config(&env)?;
        if let Some(max_supply) = config.max_supply {
            if token_count(&env) >= max_supply {
                return Err(ContractError::MaxSupplyReached);
            }
        }

        let token_id = next_token_id(&env);
        let creator = env.invoker();
        let royalty_info = royalty_override.unwrap_or(config.royalty_default.clone());
        validate_royalty_info(royalty_info.percentage)?;

        let token = TokenData {
            id: token_id,
            owner: to.clone(),
            approved: None,
            metadata_uri,
            created_at: env.ledger().timestamp(),
            creator: creator.clone(),
            royalty_percentage: royalty_info.percentage,
            royalty_recipient: royalty_info.recipient,
            attributes,
            edition_number: None,
            total_editions: None,
        };

        set_token(&env, token_id, token);
        increment_balance(&env, &to, 1);
        add_transfer_record(&env, token_id, &creator, &to);
        emit_mint(&env, to.clone(), token_id);
        emit_transfer(&env, creator, to, token_id);
        increment_token_count(&env);

        Ok(token_id)
    }

    pub fn batch_mint(
        env: Env,
        recipients: Vec<Address>,
        metadata_uris: Vec<String>,
        attributes: Vec<Vec<TokenAttribute>>,
    ) -> Result<Vec<u64>, ContractError> {
        require_role(&env, Role::Minter)?;
        require_not_paused(&env, true)?;

        if recipients.len() != metadata_uris.len() || recipients.len() != attributes.len() {
            return Err(ContractError::InvalidBatchLength);
        }

        let mut ids: Vec<u64> = Vec::new(&env);
        for idx in 0..recipients.len() {
            let to = recipients.get_unchecked(idx);
            require_whitelist(&env, &to)?;
            let uri = metadata_uris.get_unchecked(idx);
            let attrs = attributes.get_unchecked(idx);
            let id = Self::mint(env.clone(), to, uri, attrs, None)?;
            ids.push_back(id);
        }

        Ok(ids)
    }

    pub fn burn(env: Env, token_id: u64, confirm: bool) -> Result<(), ContractError> {
        if !confirm {
            return Err(ContractError::BurnNotConfirmed);
        }
        require_not_paused(&env, false)?;
        require_token_exists(&env, token_id)?;

        let token = get_token(&env, token_id)?;
        let operator = env.invoker();
        if !has_role(&env, Role::Burner, &operator) {
            transfer::require_approved_or_owner(&env, &operator, token_id, &token.owner)?;
        }
        operator.require_auth();

        del_token(&env, token_id);
        let balance = get_balance(&env, &token.owner)?;
        set_balance(&env, &token.owner, balance.saturating_sub(1));
        emit_burn(&env, token.owner, token_id);

        Ok(())
    }

    pub fn transfer(env: Env, from: Address, to: Address, token_id: u64) -> Result<(), ContractError> {
        let operator = env.invoker();
        operator.require_auth();
        transfer_internal(&env, from, to, token_id, operator, false, None)?;
        Ok(())
    }

    pub fn safe_transfer_from(
        env: Env,
        from: Address,
        to: Address,
        token_id: u64,
        data: Option<Bytes>,
    ) -> Result<(), ContractError> {
        let operator = env.invoker();
        operator.require_auth();
        transfer_internal(&env, from, to, token_id, operator, true, data)?;
        Ok(())
    }

    pub fn batch_transfer(
        env: Env,
        from: Address,
        to: Address,
        token_ids: Vec<u64>,
    ) -> Result<(), ContractError> {
        let operator = env.invoker();
        operator.require_auth();
        batch_transfer_internal(&env, from, to, token_ids, operator)?;
        Ok(())
    }

    pub fn owner_of(env: Env, token_id: u64) -> Result<Address, ContractError> {
        owner_of(&env, token_id)
    }

    pub fn balance_of(env: Env, owner: Address) -> Result<u64, ContractError> {
        get_balance(&env, &owner)
    }

    pub fn approve(env: Env, to: Address, token_id: u64) -> Result<(), ContractError> {
        require_not_paused(&env, false)?;
        require_token_exists(&env, token_id)?;
        let mut token = get_token(&env, token_id)?;
        let operator = env.invoker();
        transfer::require_owner_or_operator(&env, &operator, &token.owner)?;
        operator.require_auth();

        token.approved = Some(to.clone());
        set_token(&env, token_id, token);
        emit_approval(&env, to, token_id);
        Ok(())
    }

    pub fn get_approved(env: Env, token_id: u64) -> Result<Option<Address>, ContractError> {
        require_token_exists(&env, token_id)?;
        let token = get_token(&env, token_id)?;
        Ok(token.approved)
    }

    pub fn set_approval_for_all(
        env: Env,
        owner: Address,
        operator: Address,
        approved: bool,
    ) -> Result<(), ContractError> {
        owner.require_auth();
        storage::set_operator_approval(&env, &owner, &operator, approved);
        emit_approval_for_all(&env, owner, operator, approved);
        Ok(())
    }

    pub fn is_approved_for_all(
        env: Env,
        owner: Address,
        operator: Address,
    ) -> Result<bool, ContractError> {
        Ok(is_approved_for_all(&env, &owner, &operator))
    }

    pub fn token_uri(env: Env, token_id: u64) -> Result<String, ContractError> {
        token_uri(&env, token_id)
    }

    pub fn token_metadata(env: Env, token_id: u64) -> Result<TokenData, ContractError> {
        token_metadata(&env, token_id)
    }

    pub fn set_token_uri(env: Env, token_id: u64, uri: String) -> Result<(), ContractError> {
        require_metadata_updater(&env, token_id)?;
        set_token_uri(&env, token_id, uri)?;
        emit_metadata_update(&env, token_id);
        Ok(())
    }

    pub fn set_base_uri(env: Env, uri: String) -> Result<(), ContractError> {
        require_role(&env, Role::Admin)?;
        if metadata_locked(&env)? {
            return Err(ContractError::MetadataFrozen);
        }
        set_base_uri(&env, uri.clone())?;
        emit_base_uri_update(&env, uri);
        Ok(())
    }

    pub fn freeze_metadata(env: Env) -> Result<(), ContractError> {
        require_role(&env, Role::Admin)?;
        if metadata_locked(&env)? {
            return Err(ContractError::MetadataFrozen);
        }
        let config = get_collection_config(&env)?;
        config.metadata_is_frozen = true;
        set_collection_config(&env, config);
        Ok(())
    }

    pub fn set_default_royalty(
        env: Env,
        recipient: Address,
        percentage: u32,
    ) -> Result<(), ContractError> {
        require_role(&env, Role::Admin)?;
        set_default_royalty(&env, recipient, percentage)
    }

    pub fn set_royalty_info(
        env: Env,
        token_id: u64,
        recipient: Address,
        percentage: u32,
    ) -> Result<(), ContractError> {
        require_role(&env, Role::Admin)?;
        set_token_royalty(&env, token_id, recipient, percentage)
    }

    pub fn get_royalty_info(
        env: Env,
        token_id: u64,
        sale_price: i128,
    ) -> Result<(Address, i128), ContractError> {
        get_royalty_info(&env, token_id, sale_price)
    }

    pub fn get_transfer_history(env: Env, token_id: u64) -> Result<Vec<token::TransferRecord>, ContractError> {
        storage::get_transfer_history(&env, token_id)
    }

    pub fn supports_interface(env: Env, interface_id: soroban_sdk::Symbol) -> bool {
        supports_interface_id(&env, interface_id)
    }
}
