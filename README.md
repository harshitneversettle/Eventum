# Eventum – LMSR Prediction Market on Solana


**Architecture Diagram:** https://app.eraser.io/workspace/GvDDeSbNcF4lhveC6cn4?origin=share

Eventum is a binary prediction market protocol on Solana (YES/NO), built with Anchor and powered by an LMSR (Logarithmic Market Scoring Rule) automated market maker.

---

## Features

- Binary markets (YES/NO) with a question, start/end time, oracle, and fee  
- LMSR-based AMM for continuous liquidity and dynamic pricing  
- SOL vault PDA as collateral pool  
- Outcome tokens (YES/NO) as SPL tokens  
- Oracle-based resolution and token-burn based settlement  

---

## LMSR in Eventum

### Core Idea

For a market with YES and NO outcomes:

- q_yes: total YES tokens (in whole tokens)  
- q_no: total NO tokens (in whole tokens)  
- b: liquidity parameter

**Cost function:**

<img width="550" height="88" alt="image" src="https://github.com/user-attachments/assets/32ae9556-2d05-463f-ac09-efc2ea390047" />


**Instantaneous prices:**

<img width="550" height="165" alt="image" src="https://github.com/user-attachments/assets/837c8526-e568-44e0-8c95-d0a8e2d2c54e" />


To purchase an additional Δq_yes YES tokens, the user must pay:

<img width="550" height="88" alt="image" src="https://github.com/user-attachments/assets/e41fede8-ada2-45d7-97cc-d8900c322ae9" />


Prices move non-linearly: bigger trades move the price more, and prices can be interpreted as implied probabilities.

### Short Example

Market: “Will Virat Kohli score a century today?”

- Start: q_yes = 0, q_no = 0 → P_yes = 0.5  
- A user buys YES → q_yes increases → P_yes goes above 0.5 
- Another user buys NO → q_no increases → P_yes can drop below 0.5

User flow:

- Buy YES if you think the event will happen  
- Buy NO if you think it will not  
- Price automatically updates with each trade  

At settlement:

- Winning tokens redeemable for 1 unit of collateral (e.g. 1 token = 1 SOL)  
- Losing tokens redeem for 0  

---

## On-Chain Design

### Main Accounts

**Market**

Holds all config/state for a single market:

- `creator`: market creator  
- `oracle_authority`: address allowed to resolve  
- `yes_mint`, `no_mint`: SPL mints for outcome tokens  
- `vault`: SOL vault PDA  
- `start_time`, `end_time`: UNIX timestamps  
- `fee`: basis points (e.g. 500 = 5%)  
- `resolved`: `bool`  
- `winning_outcome`: `bool` (`true` = YES, `false` = NO)  
- `bump`: PDA bump  

**PDA Seeds**

- Market PDA: `["Market", creator, unique_market_id_le_bytes]`  
- Vault PDA: `["market-vault", market_pda]`  

**Tokens**

- YES/NO: SPL tokens with `market` as mint authority  
- User holds them in standard ATAs  

---

## Instructions

<details>
<summary><strong>1. Initialize Market</strong></summary>

#### Creates
- `Market` account (PDA)  
- YES and NO mints  
- Vault PDA address (SystemAccount for SOL)  

#### Sets
- Question, start/end time  
- Oracle authority  
- Fee (basis points)  
- `resolved = false`

<img width="720" height="291" alt="image" src="https://github.com/user-attachments/assets/19bfd6cd-8fe9-40e1-ab1d-d67ea5b50888" />

</details>

<details>
<summary><strong> 2. Buy Outcomes (YES / NO)</strong></summary>

#### Input
- `unique_market_id: u64`  
- `number_of_tokens: u64` (whole tokens)  
- `yes: bool` (true = YES, false = NO)

#### Steps (simplified)
1. Read current YES/NO supply from mints (raw units with decimals)  
2. Convert to whole tokens using `decimal_factor = 10^decimals`  
3. Compute `C_before` and `C_after` via LMSR  
4. `cost_diff = C_after - C_before` (in whole SOL)  
5. Convert to lamports (multiply by `decimal_factor`, round to `u64`)  
6. Apply protocol fee:  
   - `market_cut = base_cost * fee / 10000`  
   - `to_pay = base_cost + market_cut`  
7. Transfer `to_pay` lamports from user → vault  
8. Mint `number_of_tokens` YES or NO to user ATA (scaled by decimals)

<img width="1465" height="658" alt="image" src="https://github.com/user-attachments/assets/05f7a195-29f5-42b9-b744-f8d5ae337cf6" />

</details>



<details>
<summary><strong> 3. Resolve Market</strong></summary>

#### Input
- `unique_market_id: u64`  
- `outcome: bool` (YES = `true`, NO = `false`)

#### Checks
- Only `oracle_authority` signer can call  
- `current_time >= end_time`  
- `!market.resolved`

#### Effects
- `market.resolved = true`  
- `market.winning_outcome = outcome`

<img width="472" height="85" alt="image" src="https://github.com/user-attachments/assets/a6ddc847-7179-4855-8407-10540c268595" />

</details>


<details>
<summary><strong> 4. Claim Winnings</strong></summary>

#### Input
- `unique_market_id: u64`

#### Steps
1. Require `market.resolved == true`  
2. Select winning mint based on `winning_outcome`  
3. Read user’s winning token balance (raw units)  
4. Payout in lamports = user winning token amount (for 1:1 collateral)  
5. Transfer from vault → user  
6. Burn user’s winning tokens  

<img width="1258" height="526" alt="image" src="https://github.com/user-attachments/assets/3fea9f1c-ec09-42b3-849b-3473d3794c0e" />

</details>


## Testing

Typical tests (TypeScript + Anchor):

- Initialize market:
  - Validate PDAs, mints, oracle, times, fee  
- Buy outcomes:
  - Assert SOL debited from user and credited to vault  
  - Assert YES/NO token balances updated  
  - Observe non-linear cost as more tokens are bought  
- Resolve market:
  - Only oracle can resolve, only after `end_time`  
- Claim winnings:
  - Winning token holders receive SOL, tokens burned  
  - Losing side cannot claim  

Run:
solana-test-validator
anchor build
anchor deploy
anchor test

## Local Development (Short)

### Prerequisites
- Rust (stable) [page:1]
- Solana CLI (v1.18+) [page:1]
- Anchor CLI (v0.29+) [page:1]
- Node.js (v18+) + npm/yarn
- Git

### Setup
git clone <your-repo-url>
cd eventum
npm install # or yarn

### Run 
`anchor test` will, on localnet by default, start a local validator, build + deploy the program, run tests, then stop the validator.


