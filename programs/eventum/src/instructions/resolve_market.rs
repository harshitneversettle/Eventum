use anchor_lang::{
    accounts::{signer, unchecked_account}, prelude::*, solana_program::native_token::LAMPORTS_PER_SOL, system_program // for LAMPORTS_PER_SOL
};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, Token, TokenAccount}, // `token` module + types
};
use crate::states::Market;
use crate::ErrorCode ;


#[derive(Accounts)]
#[instruction(unique_market_id:u64)]
pub struct ResolveMarket<'info>{
    
    /// CHECK: only for deriving the seeds 
    pub creater : UncheckedAccount<'info> ,

    #[account(
        mut ,
        seeds =[ b"Market" , creater.key().as_ref() , &unique_market_id.to_le_bytes()] ,
        bump
    )]
    pub market : Account<'info , Market>,

    #[account(mut)]
    pub oracle_authority : Signer<'info> ,
    

}

pub fn handler(ctx : Context<ResolveMarket> , unique_market_id : u64 , outcome : bool )->Result<()>{
    let market = &mut ctx.accounts.market ;
    let creater = ctx.accounts.creater.key() ;
    let oracle_auth = ctx.accounts.oracle_authority.key() ;
    require!(market.resolved == false , ErrorCode::MarketResolved) ;
    require!(market.oracle_authority == oracle_auth , ErrorCode::OracleNotMatched ) ;

    market.resolved = true ;
    market.winning_outcome = outcome ;

    Ok(())
}