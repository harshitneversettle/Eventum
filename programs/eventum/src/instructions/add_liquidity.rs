use anchor_lang::{
    accounts::signer, prelude::*, solana_program::native_token::LAMPORTS_PER_SOL, system_program // for LAMPORTS_PER_SOL
};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, MintTo, Token, TokenAccount}, // `token` module + types
};
use crate::states::Market;

#[derive(Accounts)]
#[instruction(unique_market_id: u64)]
pub struct AddLiquidity<'info>{
    
    pub creater: Signer<'info> ,

    #[account(mut)]
    pub lp : Signer<'info> ,

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
    pub lp_mint: Account<'info, Mint>,    // lp_token mint account

    #[account(
        mut,
        associated_token::mint = lp_mint,
        associated_token::authority = lp,
    )]
    pub lp_ata: Account<'info, TokenAccount>,    // lp ATA for holding the received lp_tokens 

    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump
    )]
    pub pool_vault: SystemAccount<'info>,    // pool account for holding the lp_sols  , it is systemAccount because it will hold the sols 

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,


}

pub fn handler(ctx : Context<AddLiquidity> , unique_market_id: u64 , amount : u64 )->Result<()>{
    let market = &mut ctx.accounts.market ;
    let lp_token = &ctx.accounts.lp_mint ;
    let lp_ata = &ctx.accounts.lp_ata ;
    let lp = &ctx.accounts.lp ;
    let creater = &ctx.accounts.creater.key();

    // firstly the lp sends sol to the pool_vault ,
    let amount_lamports  = amount.checked_mul(LAMPORTS_PER_SOL).expect("Null reveived") ; // amount should be converted into lamports 
    let transfer_accounts = system_program::Transfer{
        from : ctx.accounts.lp.to_account_info() ,
        to : ctx.accounts.pool_vault.to_account_info() ,
    };

    if market.total_liquidity == 0 {
        let temp = amount_lamports.checked_div(2).expect("LOL") ;
        market.yes_pool = temp ;
        market.no_pool = temp ;
    }
    let cpi_ctx = CpiContext::new(ctx.accounts.system_program.to_account_info(), transfer_accounts) ;
    system_program::transfer(cpi_ctx, amount_lamports)?;


    // if the transaction is confirmed , mint equivalent numbers of lp_tokens in the lp_ata of the lp
    

    let signer_seeds : &[&[&[u8]]] = &[&[
        b"Market" , 
        creater.as_ref() ,
        &market.unique_market_id.to_le_bytes() ,
        &[market.bump] 
    ]] ;
    let number_of_tokens ;
    if market.total_liquidity == 0 {
        number_of_tokens = amount_lamports ;
    }else {
        let total_liquidity = market.total_liquidity as u128 ;
        let total_lp_supply = market.total_lp_supply ;
        let temp = (amount_lamports as u128).checked_mul(total_lp_supply as u128).expect("Some error occured : check number of tokens calculation");
        number_of_tokens = temp.checked_div(total_liquidity).expect("Some error occured : check number of tokens calculation") as u64;
    }

    let minting_accounts = MintTo{
        mint: lp_token.to_account_info() ,
        to : lp_ata.to_account_info() ,
        authority : market.to_account_info() 
    };

    let cpi_ctx2 = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), minting_accounts, signer_seeds) ;
    token::mint_to(cpi_ctx2 , number_of_tokens)?;

    market.total_liquidity = market.total_liquidity.checked_add(amount_lamports).expect("Overflow") ;
    market.total_lp_supply = market.total_lp_supply.checked_add(number_of_tokens).expect("Overflow") ;
    market.vault_bump = ctx.bumps.pool_vault ;
    

    Ok(())
}