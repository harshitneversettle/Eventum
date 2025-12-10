use crate::InitSpace;

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]


pub struct Market{
    pub creater : Pubkey ,
    pub oracle_authority : Pubkey ,
    pub unique_market_id : u64 ,
    pub start_time : i64 ,
    pub end_time : i64 ,
    pub resolved : bool ,
    #[max_len(100)]
    pub question : String ,
    pub fee : u32 ,
    pub bump : u8 ,
}