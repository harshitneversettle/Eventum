use anchor_lang::{
    accounts::{self, signer}, prelude::*, solana_program::native_token::LAMPORTS_PER_SOL, system_program // for LAMPORTS_PER_SOL
};
use anchor_spl::{
    associated_token::{AssociatedToken, spl_associated_token_account::tools::account},
    token::{self, Mint, MintTo, Token, TokenAccount}, token_2022::AmountToUiAmount, // `token` module + types
};
use crate::states::Market;
use crate::error::ErrorCode; 

#[derive(Accounts)]
#[instruction(unique_market_id: u64)]
pub struct BuyOutcomes<'info>{

    /// CHECK: Used only for PDA derivation
    pub creater: UncheckedAccount<'info>,

    #[account(mut)]
    pub user : Signer<'info> ,

    #[account(
        mut ,
        seeds =[ b"Market" , creater.key().as_ref() , &unique_market_id.to_le_bytes()] ,
        bump
    )]
    pub market : Account<'info , Market>,

    #[account(
        mut ,
        mint::authority = market 
    )]
    pub yes_mint : Account<'info  , Mint> ,

    #[account(
        mut ,
        mint::authority = market 
    )]
    pub no_mint : Account<'info  , Mint> ,

    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump
    )]
    pub pool_vault: SystemAccount<'info>, 

    #[account(
        init_if_needed,
        payer = user ,
        associated_token::mint = yes_mint ,
        associated_token::authority = user
    )]
    pub user_yes_ata : Account<'info , TokenAccount> ,

    #[account(
        init_if_needed,
        payer = user ,
        associated_token::mint = no_mint ,
        associated_token::authority = user
    )]
    pub user_no_ata : Account<'info , TokenAccount> ,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(ctx : Context<BuyOutcomes> , unique_market_id : u64 , amount : u64 , yes : bool )->Result<()> {
    let market = &mut ctx.accounts.market ;

    let creater = &ctx.accounts.creater.key() ;
    let pool_vault = &mut ctx.accounts.pool_vault ;
    let bump = market.bump ;
        

    require!(
        market.total_liquidity > 0 && market.yes_pool > 0 && market.no_pool > 0 ,
        ErrorCode::NoLiquidity
    );
    require!(market.is_active , ErrorCode::MarketNotActive );
    require!(!market.resolved, ErrorCode::MarketResolved);

    let amount_lamports = amount.checked_mul(LAMPORTS_PER_SOL).expect("error") ;
    let transfer_accounts = system_program::Transfer{
        from : ctx.accounts.user.to_account_info() ,
        to : ctx.accounts.pool_vault.to_account_info()
    } ;

    let cpi_ctx = CpiContext::new(ctx.accounts.system_program.to_account_info(), transfer_accounts) ;


    system_program::transfer(cpi_ctx, amount_lamports)?;
    let signer_seeds : &[&[&[u8]]] = &[&[
        b"Market" ,
        creater.as_ref() ,
        &unique_market_id.to_le_bytes() ,
        &[bump] 
    ]] ;

    let mut yes_pool = market.yes_pool ;
    let mut no_pool = market.no_pool ;
    let product : u128 = (yes_pool as u128).checked_mul(no_pool as u128).expect("error in multi") ;
    if yes {
        no_pool = no_pool.checked_add(amount_lamports).expect("error in addition") ;
        let new_yes_pool = product.checked_div(no_pool as u128).expect("div error") as u64;
        let tokens_out = yes_pool.checked_sub(new_yes_pool).expect("sub error") ;
        let user_yes_ata = &ctx.accounts.user_yes_ata ;

        let minting_accounts = MintTo{
            mint : ctx.accounts.yes_mint.to_account_info() ,
            to : ctx.accounts.user_yes_ata.to_account_info() ,
            authority : market.to_account_info() 
        } ;
        let cpi_context = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), minting_accounts, signer_seeds);
        token::mint_to(cpi_context, tokens_out)?;
        market.yes_tokens = market.yes_tokens.checked_add(tokens_out).expect("Overflow") ;
        market.yes_pool = new_yes_pool ;
        market.no_pool = no_pool ;


    }else {
        yes_pool = yes_pool.checked_add(amount_lamports).expect("error in addition") ;
        let new_no_pool = product.checked_div(yes_pool as u128).expect("div error") as u64 ;
        let tokens_out = no_pool.checked_sub(new_no_pool as u64).expect("sub error") ;

        let minting_accounts = MintTo{
            mint : ctx.accounts.no_mint.to_account_info() ,
            to : ctx.accounts.user_no_ata.to_account_info() ,
            authority : market.to_account_info() 
        } ;
        let cpi_ctx = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), minting_accounts, signer_seeds) ;
        token::mint_to(cpi_ctx, tokens_out)?;
        market.no_tokens = market.no_tokens.checked_add(tokens_out).expect("Overflow") ;
        market.no_pool = new_no_pool as u64 ;
        market.yes_pool = yes_pool ;
    }


    



    Ok(())
}
