use crate::InitSpace;

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]


pub struct Market{
    pub creater : Pubkey ,
    pub lp_mint : Pubkey ,
    pub oracle_authority : Pubkey ,
    pub unique_market_id : u64 ,
    pub start_time : i64 ,
    pub end_time : i64 ,
    pub resolved : bool ,
    #[max_len(100)]
    pub question : String ,
    pub vault_bump : u8 ,
    pub fee : u32 ,
    pub total_liquidity: u64,   
    pub total_lp_supply: u64,
    pub yes_mint : Pubkey ,
    pub no_mint : Pubkey ,
    pub is_active : bool ,
    pub yes_tokens : u64 ,
    pub no_tokens : u64 ,
    pub yes_pool : u64 ,
    pub no_pool : u64 ,
    pub bump : u8 ,
}