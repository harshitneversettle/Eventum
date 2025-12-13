use anchor_lang::{prelude::*, solana_program::clock::{self, UnixTimestamp}};
use anchor_spl::token::{Mint, Token};
use crate::states::Market;
use crate::InitSpace;

#[derive(Accounts)]
#[instruction(unique_market_id: u64)]
pub struct InitializeMarket<'info>{
    #[account(mut)]
    pub creater : Signer<'info> ,

    #[account(
        init , 
        payer = creater ,
        seeds =[ b"Market" , creater.key().as_ref() , &unique_market_id.to_le_bytes()] ,
        space = 8 + Market::INIT_SPACE ,
        bump 
    )]
    pub market : Account<'info ,Market> ,

    #[account(
        init,
        payer = creater,
        mint::authority = market,
        mint::decimals = 9,
        seeds = [b"lp_token", market.key().as_ref()],
        bump,
    )]
    pub lp_mint : Account<'info , Mint> ,

    #[account(
        init ,
        payer = creater ,
        mint::authority = market ,
        mint::decimals = 9 ,
        seeds = [b"yes_mint" , market.key().as_ref()] ,
        bump ,
    )]
    pub yes_mint : Account<'info , Mint> ,

    #[account(
        init ,
        payer = creater ,
        mint::authority = market ,
        mint::decimals = 9 ,
        seeds = [b"no_mint" , market.key().as_ref()] ,
        bump ,
    )]
    pub no_mint : Account<'info , Mint> ,

    pub system_program : Program<'info , System> , 
    pub token_program : Program<'info , Token>
}

pub fn handler(ctx : Context<InitializeMarket> , unique_market_id : u64  , end_time : i64 , fee : u32 , question : String )->Result<()>{
    let market = &mut ctx.accounts.market ;

    market.lp_mint = ctx.accounts.lp_mint.key() ;
    market.creater = ctx.accounts.creater.key() ;
    market.oracle_authority = ctx.accounts.creater.key() ;
    market.unique_market_id = unique_market_id ;
    market.start_time = Clock::get()?.unix_timestamp ;
    market.end_time = end_time ;
    market.resolved = false ;
    market.question = question ;
    market.fee = fee ;    // bps 
    market.bump = ctx.bumps.market ;
    market.vault_bump = 0 ;
    market.total_liquidity = 0 ;
    market.total_lp_supply = 0 ;
    market.is_active = true ;
    market.yes_mint = ctx.accounts.yes_mint.key() ;
    market.no_mint = ctx.accounts.no_mint.key() ;
    market.yes_tokens = 0 ;
    market.no_tokens = 0 ;
    market.yes_pool = 0 ;
    market.no_pool = 0 ;
    Ok(())
}