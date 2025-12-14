import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { InitializeMarketButton } from "./components/InitializeMarketButton";
import { AddLiquidityButton } from "./components/AddLiquidityButton";
import BuyOutcome from "./components/BuyOutcome";

function App() {
  const { publicKey } = useWallet();

  return (
    <div className="min-h-screen bg-black text-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">Eventum</h1>
            <p className="mt-1 text-xs text-slate-400">
              Local prediction market on Solana.
            </p>
          </div>
          <WalletMultiButton className="!rounded-lg !bg-emerald-600 !px-3 !py-2 !text-sm !font-medium hover:!bg-emerald-500" />
        </header>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Wallet
          </span>
          <p className="mt-1 text-xs font-mono break-all text-slate-100">
            {publicKey
              ? `Connected: ${publicKey.toBase58()}`
              : "Not connected. Use the button above to connect a wallet."}
          </p>
        </section>

        <main className="grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Market setup
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Create the market and LP mint for this wallet and market ID. Run
              once before any liquidity is added.
            </p>

            <div className="mt-3">
              {publicKey ? (
                <InitializeMarketButton />
              ) : (
                <p className="text-xs text-amber-400">
                  Connect a wallet to initialize a market.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-100">Liquidity</h2>
            <p className="mt-1 text-xs text-slate-400">
              Deposit into the pool using the same wallet and market ID. You
              receive LP tokens for your share.
            </p>

            <div className="mt-3">
              <AddLiquidityButton />
            </div>
          </section>
        </main>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-100">
              Trade Outcomes
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Buy YES or NO tokens based on your prediction. Trade using the AMM
              pool.
            </p>
          </div>

          {publicKey ? (
            <BuyOutcome />
          ) : (
            <div className="text-center py-12">
              <p className="text-xs text-amber-400">
                Connect a wallet to start trading.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
