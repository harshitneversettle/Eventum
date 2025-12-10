use anchor_lang::{prelude::*, solana_program::clock::{self, UnixTimestamp}};
use crate::states::{Market};
use crate::InitSpace;

#[derive(Accounts)]
#[instruction(unique_market_id: u64)]
pub struct InitializeMarket<'info>{
    #[account(
        init , 
        payer = creater ,
        seeds =[ b"Market" , creater.key().as_ref() , &unique_market_id.to_le_bytes()] ,
        space = 8 + Market::INIT_SPACE ,
        bump 
    )]
    pub initialize_market : Account<'info ,Market> ,

    #[account(mut)]
    pub creater : Signer<'info> ,
    pub system_program : Program<'info , System>
}

pub fn handler(ctx : Context<InitializeMarket> , unique_market_id : u64  , end_time : i64 , fee : u32 , question : String )->Result<()>{
    let market = &mut ctx.accounts.initialize_market ;

    market.creater = ctx.accounts.creater.key() ;
    market.oracle_authority = ctx.accounts.creater.key() ;
    market.unique_market_id = unique_market_id ;
    market.start_time = Clock::get()?.unix_timestamp ;
    market.end_time = end_time ;
    market.resolved = false ;
    market.question = question ;
    market.fee = 500 ;    // bps 
    market.bump = ctx.bumps.initialize_market ;
    Ok(())
}