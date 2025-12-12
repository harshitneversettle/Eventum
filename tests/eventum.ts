import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Eventum } from "../target/types/eventum";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import fs from "fs";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";
import {
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  getAssociatedTokenAddressSync,
  createSyncNativeInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  mintTo,
} from "@solana/spl-token";
import { BN } from "bn.js";
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

});
