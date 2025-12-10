use anchor_lang::prelude::*;

declare_id!("C2DH4MJnMgsLW9whA3bwqkApsLRu4yzvujX27e56L6qV");

#[program]
pub mod eventum {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
