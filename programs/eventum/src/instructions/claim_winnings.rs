use anchor_lang::{prelude::*, system_program};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Burn, Mint, Token, TokenAccount}
};

use crate::states::Market;
use crate::ErrorCode;

#[derive(Accounts)]
#[instruction(unique_market_id : u64)]
pub struct ClaimWinnings<'info>{
    /// CHECK: only fro seeds derivation 
    pub creater : UncheckedAccount<'info> ,

    #[account(
        mut ,
        seeds = [b"Market" , creater.key().as_ref() , &unique_market_id.to_le_bytes()] ,
        bump 
    )]
    pub market : Account<'info , Market> ,  

    #[account(mut)]
    pub user : Signer<'info> ,

    #[account(
        mut ,
        associated_token::mint = yes_mint ,
        associated_token::authority = user
    )]
    pub user_yes_ata : Account<'info , TokenAccount> ,

    #[account(
        mut ,
        associated_token::mint = no_mint ,
        associated_token::authority = user
    )]
    pub user_no_ata : Account<'info , TokenAccount> ,

    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump = market.vault_bump
    )]
    pub pool_vault: SystemAccount<'info>,

    #[account(
       mut ,
        mint::authority = market ,
        mint::decimals = 9 ,
        seeds = [b"yes_mint" , market.key().as_ref()] ,
        bump ,
    )]
    pub yes_mint : Account<'info , Mint> ,

    #[account(
        mut ,
        mint::authority = market ,
        mint::decimals = 9 ,
        seeds = [b"no_mint" , market.key().as_ref()] ,
        bump ,
    )]
    pub no_mint : Account<'info , Mint> ,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}


pub fn handler(ctx : Context<ClaimWinnings> , unique_market_id : u64)->Result<()>{
    let market = &mut ctx.accounts.market ;
    let creater = ctx.accounts.creater.key() ;
    let user = ctx.accounts.user.key() ;
    let yes_ata = &ctx.accounts.user_yes_ata ;
    let no_ata = &ctx.accounts.user_no_ata ;
    let outcome = market.winning_outcome ;  // bool 
    let yes_mint = &ctx.accounts.yes_mint ;
    let no_mint = &ctx.accounts.no_mint ;
    let pool_vault = ctx.accounts.pool_vault.key() ;
    let bump = market.bump ;
    let vault_bump= market.vault_bump ;
    let market_key = market.key() ;


    require!(market.resolved == true , ErrorCode::MarketNotResolved) ;

    // burn tokens , like if the outcome is yes and user owns yes tokens 

    let signer_seeds : &[&[&[u8]]] = &[&[
        b"Market" ,
        creater.as_ref() ,
        &unique_market_id.to_le_bytes() ,
        &[bump] 
    ]] ;

    let mut payout ;
    if outcome {    // means outcome == true ; i.e. outcome = yes 
        // burn all the yes tokens , calculate the payout , and transfer in the account
        let user_yes_tokens = ctx.accounts.user_yes_ata.amount ;
        let vault_balance = ctx.accounts.pool_vault.lamports();
        let total_yes_minted = market.yes_tokens ;
        payout = (user_yes_tokens as u128)
            .checked_mul(vault_balance as u128).unwrap()
            .checked_div(total_yes_minted as u128).unwrap() as u64;


        let burn_accounts = Burn{
            mint : ctx.accounts.yes_mint.to_account_info() ,
            from : ctx.accounts.user_yes_ata.to_account_info() ,
            authority : ctx.accounts.user.to_account_info() , 
        } ;

        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), burn_accounts ) ;
        token::burn(cpi_ctx, user_yes_tokens)?;
    }else {   // else no wins 
        let user_no_tokens = ctx.accounts.user_no_ata.amount ;
        let vault_balance = ctx.accounts.pool_vault.lamports();
        let total_no_minted = market.no_tokens ;
        payout = (user_no_tokens as u128)
            .checked_mul(vault_balance as u128).unwrap()
            .checked_div(total_no_minted as u128).unwrap() as u64;


        let burn_accounts = Burn{
            mint : ctx.accounts.no_mint.to_account_info() ,
            from : ctx.accounts.user_no_ata.to_account_info() ,
            authority : ctx.accounts.user.to_account_info() , 
        } ;

        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), burn_accounts ) ;
        token::burn(cpi_ctx, user_no_tokens)?;
    }

    // transfer the payouts 
    let transfer_accounts = system_program::Transfer{
        from : ctx.accounts.pool_vault.to_account_info() ,
        to : ctx.accounts.user.to_account_info() ,
    } ;
    let signer_seeds2 : &[&[&[u8]]] = &[&[
        b"vault" ,
        market_key.as_ref() ,
        &[vault_bump] 
    ]] ;

    let cpi_ctx = CpiContext::new_with_signer(ctx.accounts.system_program.to_account_info(), transfer_accounts, signer_seeds2) ;

    system_program::transfer(cpi_ctx, payout )?; 
    Ok(())
}