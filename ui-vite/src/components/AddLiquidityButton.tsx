import { useEffect, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEventumProgram } from "../useEventumProgram";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";

export function AddLiquidityButton() {
  const wallet = useAnchorWallet();
  const { program } = useEventumProgram();

  const [loading, setLoading] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amountUi, setAmountUi] = useState("120");

  const [lpBalance, setLpBalance] = useState<number | null>(null);
  const [lpMintAddr, setLpMintAddr] = useState<PublicKey | null>(null);
  const [marketData, setMarketData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const uniqueMarketId = new anchor.BN(1104);

  const fetchMarketData = async () => {
    if (!wallet || !program) return;

    setRefreshing(true);
    try {
      const connection = program.provider.connection;
      const creater = wallet.publicKey;
      const uniqueIdBuf = uniqueMarketId.toArrayLike(Buffer, "le", 8);

      const [marketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("Market"), creater.toBuffer(), uniqueIdBuf],
        program.programId
      );

      const marketState = await program.account.market.fetch(marketPda);
      setMarketData(marketState);
      setLpMintAddr(marketState.lpMint);

      const ataAddress = await anchor.utils.token.associatedAddress({
        mint: marketState.lpMint,
        owner: creater,
      });

      const ataInfo = await connection.getAccountInfo(ataAddress);
      if (!ataInfo) {
        setLpBalance(0);
      } else {
        const bal = await connection.getTokenAccountBalance(ataAddress);
        setLpBalance(bal.value.uiAmount ?? 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, [wallet, program, uniqueMarketId]);

  const handleClick = async () => {
    try {
      setError(null);
      setTxSig(null);

      if (!wallet || !program) {
        setError("Wallet or program not ready");
        return;
      }

      setLoading(true);

      const connection = program.provider.connection;
      const creater = wallet.publicKey;
      const lp = wallet.publicKey;

      const uniqueIdBuf = uniqueMarketId.toArrayLike(Buffer, "le", 8);

      const [marketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("Market"), creater.toBuffer(), uniqueIdBuf],
        program.programId
      );

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), marketPda.toBuffer()],
        program.programId
      );

      const marketState = await program.account.market.fetch(marketPda);

      const ataAddress = await anchor.utils.token.associatedAddress({
        mint: marketState.lpMint,
        owner: lp,
      });

      const ataInfo = await connection.getAccountInfo(ataAddress);

      if (!ataInfo) {
        const ix = createAssociatedTokenAccountInstruction(
          creater,
          ataAddress,
          lp,
          marketState.lpMint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const tx = new anchor.web3.Transaction().add(ix);
        if(tx != null ){
          await program.provider.sendAndConfirm(tx);
        }
      }

      const amount = new anchor.BN(parseInt(amountUi || "0", 10));

      const sig = await program.methods
        .addLiquidity(uniqueMarketId, amount)
        .accounts({
          creater,
          lp,
          market: marketPda,
          poolVault: vaultPda,
          lpMint: marketState.lpMint,
          lpAta: ataAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .rpc();

      setTxSig(sig);

      // Refresh after add
      await fetchMarketData();
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 w-full max-w-xl rounded-2xl border border-slate-800 bg-neutral-950 px-5 py-5 text-slate-50 shadow-md backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Add liquidity
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Deposit into the pool. You receive LP tokens.
          </p>
        </div>
        {marketData && (
          <button
            onClick={fetchMarketData}
            disabled={refreshing}
            className="text-xs px-3 py-1.5 rounded-lg border border-blue-600 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 disabled:opacity-50"
          >
            {refreshing ? "..." : "🔄"}
          </button>
        )}
      </div>

      {/* Market Stats */}
      {marketData && (
        <div className="mb-4 rounded-xl border border-blue-700 bg-blue-950/30 px-4 py-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-400">
            📊 Pool Stats
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-emerald-400 font-semibold">YES Pool:</span>{" "}
              <span className="font-mono text-slate-200">
                {(marketData.yesPool.toNumber() / 1e9).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-rose-400 font-semibold">NO Pool:</span>{" "}
              <span className="font-mono text-slate-200">
                {(marketData.noPool.toNumber() / 1e9).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Total Liquidity:</span>{" "}
              <span className="font-mono text-slate-200">
                {(marketData.totalLiquidity.toNumber() / 1e9).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Your LP Tokens:</span>{" "}
              <span className="font-mono text-emerald-300">
                {lpBalance ?? "—"}
              </span>
            </div>
          </div>
        </div>
      )}

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
            LP balance
          </div>
          <div className="font-mono text-base text-emerald-300">
            {lpBalance === null ? "—" : lpBalance}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium text-slate-200">
          Liquidity amount
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            value={amountUi}
            onChange={(e) => setAmountUi(e.target.value)}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-50 outline-none ring-0 transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          <span className="whitespace-nowrap text-xs text-slate-400">
            Same units as tests
          </span>
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
        {loading ? "Adding..." : "Add liquidity"}
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
