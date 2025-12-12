import { useState } from "react";
import * as anchor from "@coral-xyz/anchor";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEventumProgram } from "../useEventumProgram";

export function InitializeMarketButton() {
  const wallet = useAnchorWallet();
  const program = useEventumProgram();

  const [loading, setLoading] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uniqueMarketId = new anchor.BN(1104);
  const endTime = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);
  const fee = 100;
  const question = "Will Virat Kohli hit a century today ??";

  const handleClick = async () => {
    try {
      setError(null);
      setTxSig(null);

      if (!wallet) {
        setError("Wallet not connected");
        return;
      }
      if (!program) {
        setError("Program not ready");
        return;
      }

      const uniqueMarketIdBuf = uniqueMarketId.toArrayLike(Buffer, "le", 8);

      const [marketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("Market"), wallet.publicKey.toBuffer(), uniqueMarketIdBuf],
        program.programId
      );

      const [lpMintPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("lp_token"), marketPda.toBuffer()],
        program.programId
      );

      setLoading(true);

      const sig = await program.methods
        .initializeMarket(uniqueMarketId, endTime, fee, question)
        .accounts({
          creater: wallet.publicKey,
          market: marketPda,
          lpMint: lpMintPda,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .rpc();

      setTxSig(sig);
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 w-full max-w-xl rounded-2xl border border-slate-800 bg-neutral-950 px-5 py-5 text-slate-50 shadow-md backdrop-blur">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Initialize market
        </h2>
        <p className="mt-1 text-sm text-slate-300">
          Create the market account and LP mint for this wallet and market ID.
          Run this once before anyone adds liquidity.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Market ID
          </div>
          <div className="font-mono text-base text-slate-100">
            {uniqueMarketId.toString()}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Fee (bps)
          </div>
          <div className="font-mono text-base text-emerald-300">{fee}</div>
        </div>
        <div className="col-span-2 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Question
          </div>
          <div className="text-sm leading-snug text-slate-100">{question}</div>
        </div>
      </div>

      <button
        onClick={handleClick}
        disabled={loading || !wallet || !program}
        className={`flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition
          ${
            loading || !wallet || !program
              ? "cursor-not-allowed border border-emerald-800 bg-emerald-900/60 text-emerald-100/70"
              : "border border-emerald-500 bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:border-emerald-400"
          }`}
      >
        {loading ? "Initializing..." : "Initialize market"}
      </button>

      {error && (
        <p className="mt-3 break-words rounded-lg bg-rose-950/70 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      {txSig && (
        <div className="mt-3 rounded-xl border border-emerald-700 bg-emerald-950/40 px-4 py-3">
          <div className="mb-1 text-sm font-medium text-emerald-300">
            Transaction submitted
          </div>
          <div className="break-all font-mono text-xs text-emerald-100">
            {txSig}
          </div>
        </div>
      )}
    </div>
  );
}
