use core::num;

use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer as SystemTransfer};
use anchor_spl::associated_token::spl_associated_token_account::solana_program::native_token::LAMPORTS_PER_SOL;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;
use rust_decimal::{Decimal, MathematicalOps};
use rust_decimal::prelude::ToPrimitive;
use crate::states::Market;
use crate::error::ErrorCode;

#[derive(Accounts)]
#[instruction(unique_market_id: u64)]
pub struct BuyOutcomes<'info> {
    /// CHECK: Used only for PDA derivation
    pub creator: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"Market", creator.key().as_ref(), &unique_market_id.to_le_bytes()],
        bump,
    )]
    pub market: Account<'info, Market>,
    
    #[account(
        mut,
        mint::authority = market
    )]
    pub yes_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        mint::authority = market
    )]
    pub no_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        seeds = [b"market-vault", market.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,
    
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = yes_mint,
        associated_token::authority = user
    )]
    pub user_yes_ata: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = no_mint,
        associated_token::authority = user
    )]
    pub user_no_ata: Account<'info, TokenAccount>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler(
    ctx: Context<BuyOutcomes>,
    unique_market_id: u64,
    number_of_tokens: u64, 
    yes: bool
) -> Result<()> {
    require!(number_of_tokens > 0, ErrorCode::InvalidAmount);
    
    let decimals = ctx.accounts.yes_mint.decimals; 
    let decimal_factor = 10_u64.pow(decimals as u32);
    let tokens_with_decimals = number_of_tokens   // here 10 tokens is converterd into the raw units 
        .checked_mul(decimal_factor)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let curr_yes = ctx.accounts.yes_mint.supply;
    let curr_no = ctx.accounts.no_mint.supply;
    
    let b = 1000 as u64 ;
    let before_lmsr = calculate_lmsr(b, curr_yes, curr_no, decimals)?;
    
    let (after_yes, after_no) = if yes {
        (
            curr_yes.checked_add(tokens_with_decimals)
                .ok_or(ErrorCode::MathOverflow)?,
            curr_no
        )
    } else {
        (
            curr_yes,
            curr_no.checked_add(tokens_with_decimals)
                .ok_or(ErrorCode::MathOverflow)?
        )
    };
    
    let after_lmsr = calculate_lmsr(b, after_yes, after_no, decimals)?;
    
    let cost_diff = after_lmsr.checked_sub(before_lmsr)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let to_pay = cost_diff.round()
        .to_u64()
        .ok_or(ErrorCode::MathOverflow)?;
    
    transfer_amount(&ctx, to_pay)?;
    mint_tokens(&ctx, tokens_with_decimals, yes, unique_market_id)?; 
    
    Ok(())
}


pub fn calculate_lmsr(
    b: u64,
    yes: u64,
    no: u64,
    decimals: u8
) -> Result<Decimal> {
    let decimal_factor = 10u64.pow(decimals as u32);
    
    let yes_whole = Decimal::from(yes) / Decimal::from(decimal_factor);
    let no_whole = Decimal::from(no) / Decimal::from(decimal_factor);
    let b_dec = Decimal::from(b);

    let exp_yes = (yes_whole / b_dec)
        .checked_exp()
        .ok_or(ErrorCode::MathOverflow)?;
    
    let exp_no = (no_whole / b_dec)
        .checked_exp()
        .ok_or(ErrorCode::MathOverflow)?;

    let sum = exp_yes.checked_add(exp_no)
        .ok_or(ErrorCode::MathOverflow)?;
    
    let log = sum.checked_ln()
        .ok_or(ErrorCode::MathOverflow)?;
    
    let cost_whole = b_dec.checked_mul(log)
        .ok_or(ErrorCode::MathOverflow)?;    // here the cost is in sols , we have to cinvert it indo lamports 
    
    let cost_lamports = cost_whole.checked_mul(Decimal::from(LAMPORTS_PER_SOL))
        .ok_or(ErrorCode::MathOverflow)?;
    
    Ok(cost_lamports)
}

pub fn transfer_amount(
    ctx: &Context<BuyOutcomes>,
    to_pay: u64
) -> Result<()> {
    let user_balance = ctx.accounts.user.to_account_info().lamports();
    require!(user_balance >= to_pay, ErrorCode::InsufficientBalance);
    
    let transfer_accounts = SystemTransfer {
        from: ctx.accounts.user.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        transfer_accounts
    );
    
    transfer(cpi_ctx, to_pay)?;
    Ok(())
}

pub fn mint_tokens(
    ctx: &Context<BuyOutcomes>,
    amount: u64,
    yes: bool,
    unique_market_id: u64
) -> Result<()> {
    let market = &ctx.accounts.market;
    let creator = ctx.accounts.creator.key();
    let bump = market.bump;
    
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"Market",
        creator.as_ref(),
        &unique_market_id.to_le_bytes(),
        &[bump]
    ]];
    
    let (mint, ata) = if yes {
        (&ctx.accounts.yes_mint, &ctx.accounts.user_yes_ata)
    } else {
        (&ctx.accounts.no_mint, &ctx.accounts.user_no_ata)
    };
    
    let accounts = MintTo {
        mint: mint.to_account_info(),
        to: ata.to_account_info(),
        authority: market.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        accounts,
        signer_seeds
    );
    
    token::mint_to(cpi_ctx, amount)?;
    Ok(())
}
