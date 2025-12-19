use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::states::Market;


#[derive(Accounts)]
#[instruction(unique_market_id: u64)]
pub struct InitializeMarket<'info>{
    #[account(mut)]
    pub creator : Signer<'info> ,

    /// CHECK: Oracle authority is stored but not validated at initialization.
    pub oracle_authority : UncheckedAccount<'info> ,
    #[account(
        init , 
        payer = creator ,
        seeds =[ b"Market" , creator.key().as_ref() , &unique_market_id.to_le_bytes()] ,
        space = 8 + Market::INIT_SPACE ,
        bump 
    )]
    pub market : Account<'info ,Market> ,
    #[account(
        init ,
        payer = creator ,
        mint::authority = market ,
        mint::decimals = 9 ,
        seeds = [b"yes_mint" , market.key().as_ref()] ,
        bump ,
    )]
    pub yes_mint : Account<'info , Mint> ,
    #[account(
        init ,
        payer = creator ,
        mint::authority = market ,
        mint::decimals = 9 ,
        seeds = [b"no_mint" , market.key().as_ref()] ,
        bump ,
    )]
    pub no_mint : Account<'info , Mint> ,
    #[account(
        mut,
        seeds = [b"market-vault", market.key().as_ref()],
        bump
    )]
    pub vault : SystemAccount<'info>,
    pub system_program : Program<'info , System> , 
    pub token_program : Program<'info , Token>
}
pub fn handler(ctx : Context<InitializeMarket> , unique_market_id : u64  , end_time : i64 , fee : u32 , question : String )->Result<()>{
    let market = &mut ctx.accounts.market ;
    market.question = question ;
    market.creator = ctx.accounts.creator.key() ;
    market.oracle_authority = ctx.accounts.creator.key() ;
    market.unique_market_id = unique_market_id ;
    market.start_time = Clock::get()?.unix_timestamp ;
    market.end_time = end_time ;
    market.resolved = false ;
    market.winning_outcome = false ;
    market.fee = fee ;    // bps 
    market.bump = ctx.bumps.market ;
    market.vault_bump = ctx.bumps.vault;
    market.total_liquidity = 0 ;
    market.yes_mint = ctx.accounts.yes_mint.key() ;
    market.no_mint = ctx.accounts.no_mint.key() ;
    market.yes_tokens = 0 ;
    market.no_tokens = 0 ;
    Ok(())
}