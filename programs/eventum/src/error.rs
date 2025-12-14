// src/error.rs

use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
  
    #[msg("Market ID must be unique")]
    DuplicateMarketId,

    #[msg("oracle authority doesnot matched ")]
    OracleNotMatched ,
    
    #[msg("Invalid market duration")]
    InvalidDuration,
    
    #[msg("Market end time must be in the future")]
    InvalidEndTime,
    
 
    #[msg("Market has no liquidity. Add liquidity before trading.")]
    NoLiquidity,
    
    #[msg("Insufficient liquidity for this trade")]
    InsufficientLiquidity,
    
    #[msg("Cannot remove more liquidity than provided")]
    ExcessiveLiquidityRemoval,
    
    #[msg("No LP tokens to burn")]
    NoLPTokens,
    
   
    #[msg("Market is not active. Trading is disabled.")]
    MarketNotActive,
    
    #[msg("Market is already resolved. Cannot trade on settled markets.")]
    MarketResolved,
    
    #[msg("Market has expired. Cannot trade after end time.")]
    MarketExpired,
    
    #[msg("Invalid outcome selection. Must be YES or NO.")]
    InvalidOutcome,
    
    #[msg("Slippage tolerance exceeded. Price moved unfavorably.")]
    SlippageExceeded,
    
    #[msg("Trade amount too small. Minimum amount not met.")]
    AmountTooSmall,
    
    #[msg("Trade amount too large. Exceeds maximum limit.")]
    AmountTooLarge,
    
    
    #[msg("Insufficient token balance for this operation")]
    InsufficientTokens,
    
    #[msg("Cannot mint zero tokens")]
    ZeroTokenMint,
    
    #[msg("Cannot burn zero tokens")]
    ZeroTokenBurn,
    
   
    #[msg("Mathematical overflow occurred")]
    MathOverflow,
    
    #[msg("Division by zero")]
    DivisionByZero,
    
    #[msg("Invalid calculation result")]
    InvalidCalculation,
    
    
    #[msg("Market has not expired yet. Cannot resolve.")]
    MarketNotExpired,
    
    #[msg("Market is already resolved")]
    AlreadyResolved,
    
    #[msg("Invalid oracle data")]
    InvalidOracleData,
    
    #[msg("Unauthorized resolver. Only creator can resolve.")]
    UnauthorizedResolver,
    
   
    #[msg("No winnings to claim")]
    NoWinnings,
    
    #[msg("Market not resolved yet. Cannot claim winnings.")]
    MarketNotResolved,
    
    #[msg("Already claimed winnings")]
    AlreadyClaimed,
    
    #[msg("User did not bet on winning outcome")]
    NotWinner,
    
   
    #[msg("Unauthorized action. Only creator allowed.")]
    Unauthorized,
    
    #[msg("Invalid signer")]
    InvalidSigner,
    
   
    #[msg("Invalid market account")]
    InvalidMarket,
    
    #[msg("Invalid vault account")]
    InvalidVault,
    
    #[msg("Account not initialized")]
    AccountNotInitialized,
}
