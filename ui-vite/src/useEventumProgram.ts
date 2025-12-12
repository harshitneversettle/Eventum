import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import React from "react";

import type { Eventum } from "../../target/types/eventum";


import idl from "./eventum_idl.json" with { type: "json" };

const PROGRAM_ID = new PublicKey("C2DH4MJnMgsLW9whA3bwqkApsLRu4yzvujX27e56L6qV");

export function useEventumProgram() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return React.useMemo<Program<Eventum> | null>(() => {
    if (!wallet) return null;

    const provider = new AnchorProvider(connection, wallet, {});
    const prog = new Program(idl as Idl , provider) as Program<Eventum>;
    return prog;
  }, [connection, wallet]);
}
