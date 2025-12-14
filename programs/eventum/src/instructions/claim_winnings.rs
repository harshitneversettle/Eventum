use anchor_lang::{Key, context, prelude::{Context, Signer, UncheckedAccount}, solana_program::instruction};

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
        bump
    )]
    pub pool_vault: SystemAccount<'info>,

    

}


pub fn handler(ctx : Context<ClaimWinnings>)->Result<()>{
    let market = &mut ctx.accounts.market ;
    let creater = ctx.accounts.creater.key() ;
    let user = ctx.accounts.user.key() ;
    Ok(())
}