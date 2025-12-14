import { useState, useEffect } from "react";
import * as anchor from "@coral-xyz/anchor";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEventumProgram } from "../useEventumProgram";

export function InitializeMarket() {
  const wallet = useAnchorWallet();
  const { program } = useEventumProgram();

  const [loading, setLoading] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [marketId, setMarketId] = useState("");
  const [question, setQuestion] = useState("");
  const [fee, setFee] = useState("100");
  const [endDate, setEndDate] = useState("");

  const fetchMarketData = async () => {
    if (!wallet || !program || !marketId) return;

    setRefreshing(true);
    try {
      const uniqueMarketId = new anchor.BN(marketId);
      const uniqueMarketIdBuf = uniqueMarketId.toArrayLike(Buffer, "le", 8);
      const [marketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("Market"), wallet.publicKey.toBuffer(), uniqueMarketIdBuf],
        program.programId
      );

      const market = await program.account.market.fetch(marketPda);
      setMarketData(market);
      setError(null);
    } catch (e: any) {
      if (e.message?.includes("Account does not exist")) {
        setMarketData(null);
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (program && wallet && marketId) {
      fetchMarketData();
    }
  }, [program, wallet, marketId]);

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

      if (!marketId || !question || !fee || !endDate) {
        setError("Please fill in all fields");
        return;
      }

      const uniqueMarketId = new anchor.BN(marketId);
      const endTime = new anchor.BN(
        Math.floor(new Date(endDate).getTime() / 1000)
      );
      const feeBps = parseInt(fee);

      setLoading(true);

      const sig = await program.methods
        .initializeMarket(uniqueMarketId, question, feeBps, endTime)
        .accounts({
          creater: wallet.publicKey,
        })
        .rpc();

      setTxSig(sig);
      await fetchMarketData();
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl">
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-100">
            Initialize Market
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Create a new prediction market
          </p>
        </div>

        {marketData && (
          <div className="mb-6 p-4 rounded border border-slate-700 bg-slate-800">
            <div className="mb-3 text-xs font-semibold uppercase text-slate-400">
              Market Stats
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
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
              <div>
                <span className="text-slate-400">Total Liquidity:</span>
                <span className="ml-2 text-slate-100 font-mono">
                  {(marketData.totalLiquidity.toNumber() / 1e9).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Status:</span>
                <span
                  className={`ml-2 font-semibold ${
                    marketData.isActive ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {marketData.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <p className="text-slate-300 text-sm">{marketData.question}</p>
          </div>
        )}

        {!marketData && (
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Market ID
                </label>
                <input
                  type="number"
                  value={marketId}
                  onChange={(e) => setMarketId(e.target.value)}
                  placeholder="1104"
                  className="w-full px-4 py-2 rounded border border-slate-600 bg-slate-800 text-slate-100 font-mono focus:outline-none focus:border-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Fee (bps)
                </label>
                <input
                  type="number"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="100"
                  className="w-full px-4 py-2 rounded border border-slate-600 bg-slate-800 text-slate-100 font-mono focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Question
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Will Bitcoin reach $100k?"
                className="w-full px-4 py-2 rounded border border-slate-600 bg-slate-800 text-slate-100 focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">
                End Date
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 rounded border border-slate-600 bg-slate-800 text-slate-100 focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>
        )}

        {marketData && (
          <div className="mb-6 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded border border-slate-700 bg-slate-800">
                <div className="text-xs text-slate-400 mb-1">Market ID</div>
                <div className="font-mono text-slate-100">{marketId}</div>
              </div>
              <div className="p-3 rounded border border-slate-700 bg-slate-800">
                <div className="text-xs text-slate-400 mb-1">Fee (bps)</div>
                <div className="font-mono text-slate-100">
                  {marketData.feeBps.toString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="mb-4 text-sm text-red-400 bg-red-950/30 rounded px-3 py-2">
            {error}
          </p>
        )}

        <button
          onClick={handleClick}
          disabled={loading || !wallet || !program || !!marketData}
          className={`w-full px-4 py-3 rounded font-medium ${
            loading || !wallet || !program || !!marketData
              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-500"
          }`}
        >
          {marketData
            ? "Market Already Initialized"
            : loading
            ? "Initializing..."
            : "Initialize Market"}
        </button>

        {txSig && (
          <div className="mt-4 p-3 rounded bg-green-950/30 border border-green-700">
            <p className="text-sm text-green-400 mb-1">Transaction submitted</p>
            <div className="text-xs text-green-300 font-mono break-all">
              {txSig}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
