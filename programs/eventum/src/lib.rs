use anchor_lang::prelude::*;



declare_id!("C2DH4MJnMgsLW9whA3bwqkApsLRu4yzvujX27e56L6qV");

pub mod instructions;
pub mod states;

use instructions::*;

#[program]
pub mod eventum {
    use crate::instructions::initialize_market::InitializeMarket;

    use super::*;

    pub fn initialize_market(ctx: Context<InitializeMarket> , unique_market_id : u64 , end_time :i64 , fee : u32 , question : String ) -> Result<()> {
        instructions::initialize_market::handler(ctx,  unique_market_id ,end_time , fee , question)?;
        Ok(())
    }
}
