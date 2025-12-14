use anchor_lang::prelude::*;



declare_id!("C2DH4MJnMgsLW9whA3bwqkApsLRu4yzvujX27e56L6qV");

pub mod instructions;
pub mod states;

use instructions::*;
pub mod error; 
use error::ErrorCode;

#[program]
pub mod eventum {
    use crate::instructions::initialize_market::InitializeMarket;

    use super::*;

    pub fn initialize_market(ctx: Context<InitializeMarket> , unique_market_id : u64 , end_time :i64 , fee : u32 , question : String ) -> Result<()> {
        instructions::initialize_market::handler(ctx,  unique_market_id ,end_time , fee , question)?;
        Ok(())
    }

    pub fn add_liquidity(ctx: Context<AddLiquidity> , unique_market_id: u64 , amount : u64 ) -> Result<()> {
        instructions::add_liquidity::handler(ctx,unique_market_id ,  amount )?;
        Ok(())
    }

    pub fn buy_outcomes(ctx: Context<BuyOutcomes> , unique_market_id: u64 , number_of_tokens : u64 , yes : bool ) -> Result<()> {
        instructions::buy_outcomes::handler(ctx,unique_market_id ,  number_of_tokens , yes )?;
        Ok(())
    }

    pub fn resolve_market(ctx: Context<ResolveMarket> , unique_market_id: u64 , outcome : bool  ) -> Result<()> {
        instructions::resolve_market::handler(ctx , unique_market_id , outcome )?;
        Ok(())
    }
}
