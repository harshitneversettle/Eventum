import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Eventum } from "../target/types/eventum";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import fs from "fs";
import {
  getOrCreateAssociatedTokenAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";

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
    let signer = HARSHIT_KEYPAIR;
    let creater = HARSHIT_KEYPAIR.publicKey;
    let marketPda: PublicKey;
    let oracle_authority = HARSHIT_KEYPAIR.publicKey;
    let unique_market_id = 1104;
    let end_time: number;
    let resolved = false;
    let fee = 500;
    let bump: number;
    let question = "Will virat kohli hit a century today ??";

    const uniqueIdBuf = new anchor.BN(unique_market_id).toArrayLike(
      Buffer,
      "le",
      8
    );

    [marketPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("Market"), creater.toBuffer(), uniqueIdBuf],
      program.programId
    );

    const endIst = new Date("2025-12-14T18:30:00Z");
    end_time = Math.floor(endIst.getTime() / 1000);

    await program.methods
      .initializeMarket(
        new anchor.BN(unique_market_id),
        new anchor.BN(end_time),
        fee,
        question
      )
      .accounts({
        initializeMarket: marketPda,
        creater,
      })
      .signers([signer])
      .rpc();

    const marketAccount = await program.account.market.fetch(marketPda);
    console.log("Unique market id  :", marketAccount.uniqueMarketId.toNumber());
    console.log("creater :", marketAccount.creater.toString());
    console.log("lp token:", marketAccount.lpMint.toString());
    console.log("oracle Auth :", marketAccount.oracleAuthority.toString());
    console.log("question :", marketAccount.question);
    console.log("resolved  :", marketAccount.resolved);
    console.log(
      "start time :",
      new Date(marketAccount.startTime.toNumber() * 1000).toLocaleString()
    );
    console.log(
      "end time :",
      new Date(marketAccount.endTime.toNumber() * 1000).toLocaleString()
    );
    console.log("fee :", marketAccount.fee);
  });

  it("Add liquidity", async () => {
    let lp = HARSHIT_KEYPAIR;
    let creater = HARSHIT_KEYPAIR.publicKey;
    let unique_market_id = 1104;
    let amount = 120;
    const uniqueIdBuf = new anchor.BN(unique_market_id).toArrayLike(
      Buffer,
      "le",
      8
    );
    const [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("Market"), creater.toBuffer(), uniqueIdBuf],
      program.programId
    );

    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), marketPda.toBuffer()],
      program.programId
    );
    console.log("vault Address:", vaultPda.toString());
    const marketState = await program.account.market.fetch(marketPda);
    const lpBalanceBefore = await connection.getBalance(lp.publicKey);
    console.log(
      "LP SOL balance before:",
      (lpBalanceBefore / LAMPORTS_PER_SOL).toFixed(9)
    );

    const lpATA = await getOrCreateAssociatedTokenAccount(
      connection,
      lp,
      marketState.lpMint,
      lp.publicKey
    );

    await program.methods
      .addLiquidity(new anchor.BN(unique_market_id), new anchor.BN(amount))
      .accounts({
        lp: lp.publicKey,
        market: marketPda,
        poolVault: vaultPda,
        lpMint: marketState.lpMint,
        lpAta: lpATA.address,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SYSTEM_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([lp])
      .rpc();

    await new Promise((resolve) => setTimeout(resolve, 500));

    const lpBalanceAfter = await connection.getBalance(lp.publicKey);
    const vaultBalanceAfter = await connection.getBalance(vaultPda);
    const lpTokenBalance = await connection.getTokenAccountBalance(
      lpATA.address
    );

    console.log(
      "LP SOL balance after:",
      (lpBalanceAfter / LAMPORTS_PER_SOL).toFixed(9)
    );
    console.log(
      "Vault SOL balance:",
      (vaultBalanceAfter / LAMPORTS_PER_SOL).toFixed(9)
    );
    console.log(
      "LP tokens received:",
      lpTokenBalance.value.uiAmount?.toFixed(9) || 0
    );

    const updatedMarket = await program.account.market.fetch(marketPda);
    console.log("-----------------------------------------------------------");
    console.log("Total lp minted =", Number(updatedMarket.totalLpSupply) / 1e9);
    console.log(
      "Total liquidity =",
      Number(updatedMarket.totalLiquidity) / 1e9
    );
  });





  it("buy outcomes", async () => {
    let creater = HARSHIT_KEYPAIR;
    let user = TEST_KEYPAIR;
    let marketPda: PublicKey;
    let bump: number;
    let yesMint: PublicKey;
    let noMint: PublicKey;
    let poolVaultPda: PublicKey;
    let userYesAta: PublicKey;
    let userNoAta: PublicKey;
    let unique_market_id = 1104;

    const uniqueIdBuf = new anchor.BN(unique_market_id).toArrayLike(
      Buffer,
      "le",
      8
    );

    [marketPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("Market"), creater.publicKey.toBuffer(), uniqueIdBuf],
      program.programId
    );
    console.log("suvbhdvhued : ",marketPda.toString()) ;
    [poolVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), marketPda.toBuffer()],
      program.programId
    );

    console.log("\nBEFORE Trade:");

    let marketState = await program.account.market.fetch(marketPda);
    yesMint = marketState.yesMint;
    noMint = marketState.noMint;

    console.log("YES Pool:", marketState.yesPool.toNumber() / 1e9, "SOL");
    console.log("NO Pool:", marketState.noPool.toNumber() / 1e9, "SOL");
    console.log(
      "k:",
      (marketState.yesPool.toNumber() * marketState.noPool.toNumber()) / 1e18
    );

    let yesATA = await getOrCreateAssociatedTokenAccount(
      connection,
      user,
      yesMint,
      user.publicKey
    );

    let noATA = await getOrCreateAssociatedTokenAccount(
      connection,
      user,
      noMint,
      user.publicKey
    );

    userYesAta = yesATA.address;
    userNoAta = noATA.address;

    let number_of_token = 10;
    let yes = true;

    console.log(
      "\nExecuting: Buy",
      number_of_token,
      "SOL worth of",
      yes ? "YES" : "NO",
      "tokens"
    );

    const tx = await program.methods
      .buyOutcomes(
        new anchor.BN(unique_market_id),
        new anchor.BN(number_of_token),
        yes
      )
      .accounts({
        creater: creater.publicKey,
        user: user.publicKey,
        market: marketPda,
        yesMint,
        noMint,
        poolVault: poolVaultPda,
        userYesAta,
        userNoAta,
      })
      .signers([user])
      .rpc();

    console.log("Transaction:", tx);

    await connection.confirmTransaction(tx);

    console.log("\nAFTER Trade:");
    const marketStateAfter = await program.account.market.fetch(marketPda);
    console.log("YES Pool:", marketStateAfter.yesPool.toNumber() / 1e9, "SOL");
    console.log("NO Pool:", marketStateAfter.noPool.toNumber() / 1e9, "SOL");
    console.log(
      "k:",
      (marketStateAfter.yesPool.toNumber() *
        marketStateAfter.noPool.toNumber()) /
        1e18
    );

    const userTokens = await connection.getTokenAccountBalance(userYesAta);
    console.log("\nUser received:", userTokens.value.uiAmount, "YES tokens");
  });







  it("resolve market ", async () => {
    let marketPda: PublicKey;
    let bump: number;
    let oracle_authority = HARSHIT_KEYPAIR.publicKey;
    let creater = HARSHIT_KEYPAIR.publicKey;
    let outcome = true ; // yes wins
    let unique_market_id = 1104 ;

    const uniqueIdBuf = new anchor.BN(unique_market_id).toArrayLike(
      Buffer,
      "le",
      8
    );

    [marketPda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("Market"), creater.toBuffer(), uniqueIdBuf],
      program.programId
    );

    await program.methods
      .resolveMarket(new anchor.BN(unique_market_id), outcome)
      .accounts({
        creater,
        market: marketPda,
        oracle_authority,
      })
      .signers([HARSHIT_KEYPAIR])
      .rpc();

    await new Promise(resolve => setTimeout(resolve , 3000)) ;
    let marketState = await program.account.market.fetch(marketPda);
    console.log("Resolved Status : ", marketState.resolved);
    console.log("Winning outcome : ", marketState.winningOutcome);
  });
});
