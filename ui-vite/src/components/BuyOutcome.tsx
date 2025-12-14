import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { useEventumProgram } from "../useEventumProgram";

export default function BuyOutcome() {
  const { publicKey } = useWallet();
  const { program } = useEventumProgram();

  const [creatorAddress, setCreatorAddress] = useState("");
  const [marketId, setMarketId] = useState("");
  const [amount, setAmount] = useState("10");
  const [buyYes, setBuyYes] = useState(true);
  const [loading, setLoading] = useState(false);
  const [txSig, setTxSig] = useState("");
  const [error, setError] = useState("");
  const [marketData, setMarketData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMarketData = async () => {
    if (!program || !creatorAddress || !marketId) return;

    setRefreshing(true);
    setError("");
    try {
      const creater = new PublicKey(creatorAddress);
      const uniqueMarketId = new anchor.BN(marketId);
      const uniqueIdBuf = uniqueMarketId.toArrayLike(Buffer, "le", 8);

      const [marketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("Market"), creater.toBuffer(), uniqueIdBuf],
        program.programId
      );

      const market = await program.account.market.fetch(marketPda);
      setMarketData(market);
    } catch (e: any) {
      console.error("Failed to fetch market:", e);
      setError("Market not found");
    } finally {
      setRefreshing(false);
    }
  };

  const handleBuy = async () => {
    if (!program || !publicKey || !marketData) {
      setError("Please connect wallet and load market");
      return;
    }

    setLoading(true);
    setError("");
    setTxSig("");

    try {
      const creater = new PublicKey(creatorAddress);
      const uniqueMarketId = new anchor.BN(marketId);

      const sig = await program.methods
        .buyOutcomes(uniqueMarketId, new anchor.BN(amount), buyYes)
        .accounts({
          creater: creater,
          user: publicKey,
          yesMint: marketData.yesMint,
          noMint: marketData.noMint,
        })
        .rpc();

      setTxSig(sig);
      setTimeout(() => fetchMarketData(), 2000);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl">
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold text-slate-100 mb-6">
          Trade Market
        </h2>

        {marketData && (
          <div className="mb-6 p-4 rounded border border-slate-700 bg-slate-800">
            <p className="text-slate-200 mb-4">{marketData.question}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">YES Pool:</span>
                <span className="ml-2 text-slate-100 font-mono">
                  {(marketData.yesPool.toNumber() / 1e9).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">NO Pool:</span>
                <span className="ml-2 text-slate-100 font-mono">
                  {(marketData.noPool.toNumber() / 1e9).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Creator Address
            </label>
            <input
              type="text"
              value={creatorAddress}
              onChange={(e) => setCreatorAddress(e.target.value)}
              placeholder="Enter creator address"
              className="w-full px-4 py-2 rounded border border-slate-600 bg-slate-800 text-slate-100 text-sm font-mono focus:outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Market ID
            </label>
            <input
              type="text"
              value={marketId}
              onChange={(e) => setMarketId(e.target.value)}
              placeholder="Enter market ID"
              className="w-full px-4 py-2 rounded border border-slate-600 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:border-slate-500"
            />
          </div>

          {!marketData && creatorAddress && marketId && (
            <button
              onClick={fetchMarketData}
              disabled={refreshing}
              className="w-full px-4 py-2 rounded bg-slate-700 text-slate-200 text-sm font-medium hover:bg-slate-600 disabled:opacity-50"
            >
              {refreshing ? "Loading..." : "Load Market"}
            </button>
          )}

          {marketData && (
            <>
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2 rounded border border-slate-600 bg-slate-800 text-slate-100 focus:outline-none focus:border-slate-500"
                  step="1"
                  min="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setBuyYes(true)}
                  className={`px-4 py-2 rounded font-medium ${
                    buyYes
                      ? "bg-green-600 text-white"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  YES
                </button>
                <button
                  onClick={() => setBuyYes(false)}
                  className={`px-4 py-2 rounded font-medium ${
                    !buyYes
                      ? "bg-red-600 text-white"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  NO
                </button>
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-950/30 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleBuy}
            disabled={loading || !marketData || !publicKey}
            className="w-full px-4 py-3 rounded bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Processing..."
              : !publicKey
              ? "Connect Wallet"
              : !marketData
              ? "Load Market First"
              : `Buy ${buyYes ? "YES" : "NO"}`}
          </button>

          {txSig && (
            <div className="p-3 rounded bg-green-950/30 border border-green-700">
              <p className="text-sm text-green-400 mb-1">
                Transaction successful
              </p>
              <a
                href={`https://explorer.solana.com/tx/${txSig}?cluster=custom&customUrl=http://127.0.0.1:8899`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-300 font-mono break-all hover:underline"
              >
                {txSig}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
