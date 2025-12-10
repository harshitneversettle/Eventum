import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Eventum } from "../target/types/eventum";
import { Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";
import { BN } from "bn.js";

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
});
