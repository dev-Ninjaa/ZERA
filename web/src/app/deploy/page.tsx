"use client";

import { useState } from "react";
import { Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/hooks/useWallet";

type Phase = "idle" | "deploying" | "recording" | "done" | "error";

export default function DeployPage() {
  const {
    walletApi,
    unshieldedAddress,
    walletNetworkId,
    isConnected,
    isRestoring,
    connectWallet,
  } = useWallet();

  const [phase, setPhase] = useState<Phase>("idle");
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordToken, setRecordToken] = useState("");
  const [statusLog, setStatusLog] = useState<string[]>([]);

  const log = (line: string) => setStatusLog((prev) => [...prev, line]);

  const deploy = async () => {
    setStatusLog([]);
    setError(null);
    setPhase("deploying");

    try {
      log("Loading deployment module…");
      // Lazy import — defers the entire Midnight WASM + LevelDB stack until
      // the user explicitly clicks Deploy. Loading it at module level crashes
      // Next.js on Windows because LevelDB's native addon initialises too early.
      const { deployZeraContract } = await import("@/lib/zera-browser-deploy");

      log("Building providers…");
      log("Submitting deployment transaction — approve in your wallet…");
      const deployed: any = await deployZeraContract(walletApi!, unshieldedAddress!);

      const contractAddress = deployed.deployTxData.public.contractAddress as string;
      const transactionId =
        deployed.deployTxData.public.txId ?? deployed.deployTxData.public.txHash;
      log(`Contract deployed at: ${contractAddress}`);

      setPhase("recording");
      log("Saving deployment record…");
      const response = await fetch("/api/contract/deploy", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(recordToken ? { "x-zera-deploy-token": recordToken } : {}),
        },
        body: JSON.stringify({
          contractAddress,
          transactionId,
          network: walletNetworkId,
          walletAddress: unshieldedAddress,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error ?? "The contract deployed, but its address could not be saved.",
        );

      setAddress(contractAddress);
      setPhase("done");
      log("Done.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Deployment failed.";
      log(`Error: ${msg}`);
      setPhase("error");
      setError(msg);
    }
  };

  // ── panel ────────────────────────────────────────────────────────────────

  const renderPanel = () => {
    // Restore in flight — show spinner, don't flash connect prompt.
    if (isRestoring) {
      return (
        <div className="flex items-center gap-3 py-2 text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span className="font-mono text-xs">Reconnecting wallet session…</span>
        </div>
      );
    }

    // Not connected at all.
    if (!isConnected || !walletApi) {
      return (
        <>
          <p className="text-sm text-text-secondary">
            Connect a funded wallet on the configured Midnight network to continue.
          </p>
          <Button className="mt-5 gap-2" onClick={() => void connectWallet()}>
            <Rocket className="h-4 w-4" /> Connect wallet
          </Button>
        </>
      );
    }

    // Connected and wallet API is live — show deploy form.
    return (
      <>
        <p className="font-mono text-xs text-text-muted">NETWORK: {walletNetworkId}</p>
        <p className="mt-2 break-all font-mono text-xs text-text-secondary">
          DEPLOYER: {unshieldedAddress}
        </p>
        <p className="mt-5 text-sm leading-6 text-text-secondary">
          Ensure this wallet has tNIGHT and available DUST. Your wallet will ask you to approve
          the deployment transaction.
        </p>
        <label className="mt-5 block text-xs text-text-muted" htmlFor="record-token">
          Production record token (local development does not need one)
        </label>
        <input
          id="record-token"
          type="password"
          value={recordToken}
          onChange={(e) => setRecordToken(e.target.value)}
          autoComplete="off"
          className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-2 font-mono text-xs outline-none focus:border-lime"
        />
        <Button
          className="mt-5 gap-2"
          onClick={() => void deploy()}
          disabled={phase === "deploying" || phase === "recording"}
        >
          <Rocket className="h-4 w-4" />
          {phase === "deploying"
            ? "Deploying…"
            : phase === "recording"
              ? "Saving deployment…"
              : "Deploy contract"}
        </Button>
      </>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 lg:px-10">
      <p className="text-xs font-mono uppercase tracking-[0.2em] text-lime">
        Contract administration
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Deploy Zera Asset Registry</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
        Deploy directly from your 1AM wallet. Your wallet pays and signs; Zera never receives
        your seed. The generated contract and ZK artifacts are copied into the web app before it
        starts — no Compact compilation runs here.
      </p>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        {renderPanel()}
      </div>

      {statusLog.length > 0 && (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-muted mb-2">
            Deploy log
          </p>
          <div className="flex flex-col gap-1">
            {statusLog.map((line, i) => (
              <p key={i} className="font-mono text-xs text-text-secondary">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 font-mono text-xs leading-5 text-red-200">
          {error}
        </p>
      )}

      {phase === "done" && address && (
        <div className="mt-5 rounded-xl border border-lime/30 bg-lime/10 p-5">
          <p className="font-medium text-lime">Contract deployed and saved.</p>
          <p className="mt-2 break-all font-mono text-xs text-text-primary">{address}</p>
          <p className="mt-3 text-xs text-text-secondary">
            Written to deployment-contract.json and deployment.json in the repository root.
          </p>
        </div>
      )}
    </div>
  );
}
