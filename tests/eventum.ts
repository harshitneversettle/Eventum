import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Eventum } from "../target/types/eventum";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import fs from "fs";
import {
  getOrCreateAssociatedTokenAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createTransferCheckedInstruction,
} from "@solana/spl-token";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import { create } from "domain";

describe("eventum", () => {
  const connection = new anchor.web3.Connection(
    "http://127.0.0.1:8899",
    "confirmed"
  );
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.eventum as Program<Eventum>;

  const HARSHIT_KEYPAIR = Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(
        fs.readFileSync("/home/titan/Desktop/eventum/Maker.json", "utf8")
      )
    )
  );

  const TEST_KEYPAIR = Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(fs.readFileSync("/home/titan/Desktop/eventum/lp.json", "utf8"))
    )
  );

  console.log("harsit : ", HARSHIT_KEYPAIR.publicKey.toString());
  console.log("test : ", TEST_KEYPAIR.publicKey.toString());

  it("Initialize Market", async () => {
    const signer = HARSHIT_KEYPAIR;
    const creator = signer.publicKey;
    const oracleAuthority = creator;
    const unique_market_id = 1104;
    const fee = 5000 ;
    const question = "Will virat kohli hit a century today ??";
    const uniqueIdBuf = new anchor.BN(unique_market_id).toArrayLike(
      Buffer,
      "le",
      8
    );
    const [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("Market"), creator.toBuffer(), uniqueIdBuf],
      program.programId
    );
    const end_time = Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60;
    await program.methods
      .initializeMarket(
        new anchor.BN(unique_market_id),
        new anchor.BN(end_time),
        fee,
        question
      )
      .accounts({
        market: marketPda,
        creator,
        oracleAuthority,
      })
      .signers([signer])
      .rpc();
    const market = await program.account.market.fetch(marketPda);
    console.log("Market initialized");
    console.log("Market ID:", market.uniqueMarketId.toNumber());
    console.log("Market PDA:", marketPda.toString());
    console.log("Creator:", market.creator.toString());
    console.log("Oracle:", market.oracleAuthority.toString());
    console.log("Resolved:", market.resolved);
    console.log(
      "Start:",
      new Date(market.startTime.toNumber() * 1000).toLocaleString()
    );
    console.log(
      "End:",
      new Date(market.endTime.toNumber() * 1000).toLocaleString()
    );
    console.log("Fee:", market.fee);
    console.log("Question:", market.question);
  });

  // // it("Add liquidity", async () => {
  // //   await new Promise((resolve) => setTimeout(resolve, 2000));
  // //   let lp = HARSHIT_KEYPAIR;
  // //   let creator = HARSHIT_KEYPAIR.publicKey;
  // //   let unique_market_id = 1104;
  // //   let amount = 120;
  // //   const uniqueIdBuf = new anchor.BN(unique_market_id).toArrayLike(
  // //     Buffer,
  // //     "le",
  // //     8
  // //   );
  // //   const [marketPda] = PublicKey.findProgramAddressSync(
  // //     [Buffer.from("Market"), creator.toBuffer(), uniqueIdBuf],
  // //     program.programId
  // //   );

  // //   const [vaultPda] = PublicKey.findProgramAddressSync(
  // //     [Buffer.from("vault"), marketPda.toBuffer()],
  // //     program.programId
  // //   );
  // //   console.log("vault Address:", vaultPda.toString());
  // //   const marketState = await program.account.market.fetch(marketPda);
  // //   const lpBalanceBefore = await connection.getBalance(lp.publicKey);
  // //   console.log(
  // //     "LP SOL balance before:",
  // //     (lpBalanceBefore / LAMPORTS_PER_SOL).toFixed(9)
  // //   );

  // //   const lpATA = await getOrCreateAssociatedTokenAccount(
  // //     connection,
  // //     lp,
  // //     marketState.lpMint,
  // //     lp.publicKey
  // //   );

  // //   await program.methods
  // //     .addLiquidity(new anchor.BN(unique_market_id), new anchor.BN(amount))
  // //     .accounts({
  // //       lp: lp.publicKey,
  // //       market: marketPda,
  // //       poolVault: vaultPda,
  // //       lpMint: marketState.lpMint,
  // //       lpAta: lpATA.address,
  // //       tokenProgram: TOKEN_PROGRAM_ID,
  // //       systemProgram: SYSTEM_PROGRAM_ID,
  // //       associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  // //     })
  // //     .signers([lp])
  // //     .rpc();

  // //   await new Promise((resolve) => setTimeout(resolve, 500));

  // //   const lpBalanceAfter = await connection.getBalance(lp.publicKey);
  // //   const vaultBalanceAfter = await connection.getBalance(vaultPda);
  // //   const lpTokenBalance = await connection.getTokenAccountBalance(
  // //     lpATA.address
  // //   );

  // //   console.log(
  // //     "LP SOL balance after:",
  // //     (lpBalanceAfter / LAMPORTS_PER_SOL).toFixed(9)
  // //   );
  // //   console.log(
  // //     "Vault SOL balance:",
  // //     (vaultBalanceAfter / LAMPORTS_PER_SOL).toFixed(9)
  // //   );
  // //   console.log(
  // //     "LP tokens received:",
  // //     lpTokenBalance.value.uiAmount?.toFixed(9) || 0
  // //   );

  // //   const updatedMarket = await program.account.market.fetch(marketPda);
  // //   console.log("--------------------------------------------------");
  // //   console.log("Total lp minted =", Number(updatedMarket.totalLpSupply) / 1e9);
  // //   console.log(
  // //     "Total liquidity =",
  // //     Number(updatedMarket.totalLiquidity) / 1e9
  // //   );
  // // });

  it("buy outcomes", async () => {
    // Wait for previous transaction to settle
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const creator = HARSHIT_KEYPAIR;
    const user = TEST_KEYPAIR;
    const unique_market_id = 1104;

    // Derive PDAs
    const uniqueIdBuffer = new anchor.BN(unique_market_id).toArrayLike(
      Buffer,
      "le",
      8
    );

    const [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("Market"), creator.publicKey.toBuffer(), uniqueIdBuffer],
      program.programId
    );

    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market-vault"), marketPda.toBuffer()],
      program.programId
    );

    console.log("Market PDA:", marketPda.toString());
    console.log("Vault PDA:", vaultPda.toString());

    // Fund vault with initial liquidity
    const vaultFundingAmount = 100 * LAMPORTS_PER_SOL;
    const fundVaultIx = SystemProgram.transfer({
      fromPubkey: creator.publicKey,
      toPubkey: vaultPda,
      lamports: vaultFundingAmount,
    });

    const fundTx = new Transaction().add(fundVaultIx);
    const fundSig = await sendAndConfirmTransaction(connection, fundTx, [
      creator,
    ]);
    console.log("Vault funded. Signature:", fundSig);

    // Fetch market state and mint accounts
    const marketState = await program.account.market.fetch(marketPda);
    const yesMint = marketState.yesMint;
    const noMint = marketState.noMint;

    console.log("YES Mint:", yesMint.toString());
    console.log("NO Mint:", noMint.toString());

    // Get or create user ATAs
    const yesATA = await getOrCreateAssociatedTokenAccount(
      connection,
      user,
      yesMint,
      user.publicKey
    );

    const noATA = await getOrCreateAssociatedTokenAccount(
      connection,
      user,
      noMint,
      user.publicKey
    );

    const userYesAta = yesATA.address;
    const userNoAta = noATA.address;

    console.log("User YES ATA:", userYesAta.toString());
    console.log("User NO ATA:", userNoAta.toString());

    // Get initial balances
    const userSolBalanceBefore = await connection.getBalance(user.publicKey);
    const vaultBalanceBefore = await connection.getBalance(vaultPda);

    console.log("\n--- BEFORE TRADE ---");
    console.log(
      "User SOL Balance:",
      userSolBalanceBefore / LAMPORTS_PER_SOL,
      "SOL"
    );
    console.log("Vault Balance:", vaultBalanceBefore / LAMPORTS_PER_SOL, "SOL");

    // Trade parameters
    const numberOfTokens = 10;
    const buyYes = true;

    console.log(
      "\nExecuting trade: Buy",
      numberOfTokens,
      buyYes ? "YES" : "NO",
      "tokens"
    );

    // Execute buy transaction
    const buySig = await program.methods
      .buyOutcomes(
        new anchor.BN(unique_market_id),
        new anchor.BN(numberOfTokens),
        buyYes
      )
      .accounts({
        creator: creator.publicKey,
        user: user.publicKey,
        market: marketPda,
        yesMint,
        noMint,
        vault: vaultPda,
        userYesAta,
        userNoAta,
      })
      .signers([user])
      .rpc();

    console.log("Buy transaction signature:", buySig);

    // Confirm transaction
    await connection.confirmTransaction(buySig, "confirmed");

    // Get final balances
    const userSolBalanceAfter = await connection.getBalance(user.publicKey);
    const vaultBalanceAfter = await connection.getBalance(vaultPda);
    const userYesBalance = await connection.getTokenAccountBalance(userYesAta);
    const userNoBalance = await connection.getTokenAccountBalance(userNoAta);

    console.log("\n--- AFTER TRADE ---");
    console.log(
      "User SOL Balance:",
      userSolBalanceAfter / LAMPORTS_PER_SOL,
      "SOL"
    );
    console.log("Vault Balance:", vaultBalanceAfter / LAMPORTS_PER_SOL, "SOL");
    console.log(
      "SOL Spent:",
      (userSolBalanceBefore - userSolBalanceAfter) / LAMPORTS_PER_SOL,
      "SOL"
    );
    console.log("User YES tokens:", userYesBalance.value.uiAmount);
    console.log("User NO tokens:", userNoBalance.value.uiAmount);

    // Assertions
    console.log("\n--- VALIDATION ---");
    const expectedTokens = buyYes
      ? userYesBalance.value.uiAmount
      : userNoBalance.value.uiAmount;
    console.log("Expected tokens received:", expectedTokens);
    console.log("Transaction confirmed successfully");
  });

  it("resolve market ", async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    let marketPda: PublicKey;
    let bump: number;
    let oracle_authority = HARSHIT_KEYPAIR.publicKey;
    let creator = HARSHIT_KEYPAIR.publicKey;
    let outcome = true; // yes wins
    let unique_market_id = 1104;

    const uniqueIdBuf = new anchor.BN(unique_market_id).toArrayLike(
      Buffer,
      "le",
      8
    );

    [marketPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("Market"), creator.toBuffer(), uniqueIdBuf],
      program.programId
    );

    await program.methods
      .resolveMarket(new anchor.BN(unique_market_id), outcome)
      .accounts({
        creator,
        market: marketPda,
        oracle_authority,
      })
      .signers([HARSHIT_KEYPAIR])
      .rpc();

    await new Promise((resolve) => setTimeout(resolve, 2000));
    let marketState = await program.account.market.fetch(marketPda);
    console.log("Resolved Status : ", marketState.resolved);
    console.log("Winning outcome : ", marketState.winningOutcome);
  });

  it("claim winnings", async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const creator = HARSHIT_KEYPAIR.publicKey;
    const user = TEST_KEYPAIR;
    const unique_market_id = 1104;

    const uniqueIdBuffer = new anchor.BN(unique_market_id).toArrayLike(
      Buffer,
      "le",
      8
    );

    const [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("Market"), creator.toBuffer(), uniqueIdBuffer],
      program.programId
    );

    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market-vault"), marketPda.toBuffer()],
      program.programId
    );

    const marketState = await program.account.market.fetch(marketPda);
    const yesMint = marketState.yesMint;
    const noMint = marketState.noMint;

    const userYesAta = await getOrCreateAssociatedTokenAccount(
      connection,
      user,
      yesMint,
      user.publicKey
    );

    const userNoAta = await getOrCreateAssociatedTokenAccount(
      connection,
      user,
      noMint,
      user.publicKey
    );

    const userSolBefore = await connection.getBalance(user.publicKey);
    const vaultBalanceBefore = await connection.getBalance(vaultPda);
    const userYesTokensBefore = (
      await connection.getTokenAccountBalance(userYesAta.address)
    ).value.uiAmount;

    console.log("\nClaim Winnings Test");
    console.log("Market:", marketPda.toString());
    console.log("Winning Outcome:", marketState.winningOutcome ? "YES" : "NO");
    console.log(
      "\nUser SOL before:",
      (userSolBefore / LAMPORTS_PER_SOL).toFixed(6)
    );
    console.log("User YES tokens:", userYesTokensBefore);
    console.log(
      "Vault balance:",
      (vaultBalanceBefore / LAMPORTS_PER_SOL).toFixed(6)
    );

    const claimSig = await program.methods
      .claimWinnings(new anchor.BN(unique_market_id))
      .accounts({
        creator,
        market: marketPda,
        user: user.publicKey,
        userYesAta: userYesAta.address,
        userNoAta: userNoAta.address,
        poolVault: vaultPda,
        yesMint,
        noMint,
      })
      .signers([user])
      .rpc();

    await connection.confirmTransaction(claimSig, "confirmed");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const userSolAfter = await connection.getBalance(user.publicKey);
    const vaultBalanceAfter = await connection.getBalance(vaultPda);
    const userYesTokensAfter = (
      await connection.getTokenAccountBalance(userYesAta.address)
    ).value.uiAmount;

    const solReceived = (userSolAfter - userSolBefore) / LAMPORTS_PER_SOL;
    const tokensBurned = (userYesTokensBefore || 0) - (userYesTokensAfter || 0);

    console.log(
      "\nUser SOL after:",
      (userSolAfter / LAMPORTS_PER_SOL).toFixed(6)
    );
    console.log("User YES tokens:", userYesTokensAfter);
    console.log(
      "Vault balance:",
      (vaultBalanceAfter / LAMPORTS_PER_SOL).toFixed(6)
    );
    console.log("\nSOL received:", solReceived.toFixed(6));
    console.log("Tokens burned:", tokensBurned);
    console.log("Transaction:", claimSig);
  });


});
