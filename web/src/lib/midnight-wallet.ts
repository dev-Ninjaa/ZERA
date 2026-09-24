/**
 * Wallet discovery and connection via the Midnight DApp Connector API.
 *
 * NOTE: This file intentionally does NOT import @midnight-ntwrk/ledger-v8 at
 * the top level. That package ships WASM which crashes Next.js on Windows when
 * loaded at module evaluation time. nativeToken() is imported lazily inside
 * the async functions that actually need it.
 */
import "@midnight-ntwrk/dapp-connector-api";
import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";

export type WalletBalance = {
  raw: string;
  label: string;
};

export type WalletSession = {
  api: ConnectedAPI;
  address: string;
  networkId: string;
  shieldedAddress: string;
  unshieldedAddress: string;
  dustAddress: string;
  shieldedBalances: Record<string, bigint>;
  unshieldedBalances: Record<string, bigint>;
  dustBalance: { balance: bigint; cap: bigint };
  nightBalance: { shielded: bigint; unshielded: bigint; total: bigint };
};

/** @deprecated Use WalletSession */
export type LaceSession = WalletSession;

const NETWORK_ID = process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK_ID || "preprod";

function getAllInjectedWallets(): Array<[string, InitialAPI]> {
  if (typeof window === "undefined") return [];
  return Object.entries(window.midnight ?? {}) as Array<[string, InitialAPI]>;
}

/**
 * Preference order:
 *   1. 1am  — sponsors tDUST, so proving Just Works on Preprod.
 *   2. Any non-Lace wallet.
 *   3. Lace — last resort.
 *   4. wallets[0] — final tiebreaker.
 */
function findPreferredWallet(wallets: InitialAPI[]): InitialAPI | undefined {
  const isLace  = (w: InitialAPI) => w.rdns.toLowerCase().includes("lace");
  const isOneAm = (w: InitialAPI) => w.rdns.toLowerCase().includes("1am");
  return (
    wallets.find(isOneAm) ??
    wallets.find((w) => !isLace(w)) ??
    wallets.find(isLace) ??
    wallets[0]
  );
}

export function getPreferredWallet(): InitialAPI | null {
  if (typeof window === "undefined") return null;
  return findPreferredWallet(getAllInjectedWallets().map(([, w]) => w)) ?? null;
}
/** @deprecated */ export const getLaceWallet = getPreferredWallet;

export function getWalletAvailabilityDetails(): string {
  if (typeof window === "undefined") return "Wallet detection only runs in the browser.";
  const injected = getAllInjectedWallets();
  if (injected.length === 0) return "No Midnight wallet was injected into window.midnight.";
  return `Detected wallets: ${injected.map(([k, w]) => `${k} (${w.name}, api ${w.apiVersion})`).join(", ")}`;
}
/** @deprecated */ export const getLaceAvailabilityDetails = getWalletAvailabilityDetails;

function isChannelShutdown(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const m = error.message.toLowerCase();
  return m.includes("was shutdown") || m.includes("no longer be used") || m.includes("channel closed");
}

async function buildNightBalance(
  shieldedBalances: Record<string, bigint>,
  unshieldedBalances: Record<string, bigint>,
): Promise<{ shielded: bigint; unshielded: bigint; total: bigint }> {
  // Lazy-import ledger-v8 so it only loads when a wallet function is actually
  // called — not at module evaluation time (which crashes Next.js on Windows).
  const { nativeToken } = await import("@midnight-ntwrk/ledger-v8");
  const key = nativeToken().raw;
  const shielded   = shieldedBalances[key]   ?? 0n;
  const unshielded = unshieldedBalances[key] ?? 0n;
  return { shielded, unshielded, total: shielded + unshielded };
}

export async function connectWalletSession(): Promise<WalletSession> {
  let wallets = getAllInjectedWallets().map(([, w]) => w);

  // Retry up to 10× at 300 ms — extensions inject asynchronously.
  if (wallets.length === 0) {
    await new Promise<void>((resolve) => {
      let attempts = 0;
      const timer = window.setInterval(() => {
        const found = getAllInjectedWallets().map(([, w]) => w);
        attempts += 1;
        if (found.length > 0 || attempts >= 10) {
          wallets = found;
          window.clearInterval(timer);
          resolve();
        }
      }, 300);
    });
  }

  const wallet = findPreferredWallet(wallets);
  if (!wallet) {
    throw new Error(
      `No Midnight wallet found. Install the 1AM wallet extension, then refresh the page. ${getWalletAvailabilityDetails()}`,
    );
  }

  const api = await wallet.connect(NETWORK_ID).catch((error: unknown) => {
    throw new Error(
      `Connection request was rejected by ${wallet.name}.` +
        (error instanceof Error && error.message ? ` ${error.message}` : ""),
    );
  });

  const connection = await api.getConnectionStatus();
  if (connection.status !== "connected") {
    throw new Error("Wallet reported a disconnected session. Unlock the wallet and try again.");
  }
  if (connection.networkId !== NETWORK_ID) {
    throw new Error(
      `Wrong network: wallet is on "${connection.networkId}", but this app expects "${NETWORK_ID}". ` +
        `Switch ${wallet.name} to ${NETWORK_ID} and reconnect.`,
    );
  }

  if (typeof api.hintUsage === "function") {
    await api.hintUsage(["getShieldedAddresses", "getProvingProvider", "balanceUnsealedTransaction", "submitTransaction"]);
  } else {
    const legacyEnable = (api as { enable?: unknown }).enable;
    if (typeof legacyEnable === "function") {
      await (legacyEnable as () => Promise<unknown>).call(api);
    } else {
      console.warn(`${wallet.name} implements neither hintUsage() nor enable(); relying on permissions granted at connect().`);
    }
  }

  try {
    const [shielded, unshielded, dust, shieldedBalances, unshieldedBalances, dustBalance] =
      await Promise.all([
        api.getShieldedAddresses(),
        api.getUnshieldedAddress(),
        api.getDustAddress(),
        api.getShieldedBalances(),
        api.getUnshieldedBalances(),
        api.getDustBalance(),
      ]);

    const nightBalance = await buildNightBalance(shieldedBalances, unshieldedBalances);
    console.log("[Wallet] Total NIGHT:", formatNightAmount(nightBalance.total));

    return {
      api,
      address: shielded.shieldedAddress,
      networkId: connection.networkId,
      shieldedAddress: shielded.shieldedAddress,
      unshieldedAddress: unshielded.unshieldedAddress,
      dustAddress: dust.dustAddress,
      shieldedBalances,
      unshieldedBalances,
      dustBalance,
      nightBalance,
    };
  } catch (error) {
    if (isChannelShutdown(error)) {
      throw new Error("Wallet session dropped. Your wallet extension went to sleep — click Connect again to retry.");
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}
/** @deprecated */ export const connectLaceWallet = connectWalletSession;

export async function restoreWalletSession(): Promise<WalletSession | null> {
  const wallet = findPreferredWallet(getAllInjectedWallets().map(([, w]) => w));
  if (!wallet) return null;

  const api = await wallet.connect(NETWORK_ID).catch(() => null);
  if (!api) return null;

  const connected = await api.getConnectionStatus().catch(() => null);
  if (!connected || connected.status !== "connected" || connected.networkId !== NETWORK_ID) return null;

  try {
    const [shielded, unshielded, dust, shieldedBalances, unshieldedBalances, dustBalance] =
      await Promise.all([
        api.getShieldedAddresses(),
        api.getUnshieldedAddress(),
        api.getDustAddress(),
        api.getShieldedBalances(),
        api.getUnshieldedBalances(),
        api.getDustBalance(),
      ]);

    const nightBalance = await buildNightBalance(shieldedBalances, unshieldedBalances);
    console.log("[Wallet Restore] Total NIGHT:", formatNightAmount(nightBalance.total));

    return {
      api,
      address: shielded.shieldedAddress,
      networkId: connected.networkId,
      shieldedAddress: shielded.shieldedAddress,
      unshieldedAddress: unshielded.unshieldedAddress,
      dustAddress: dust.dustAddress,
      shieldedBalances,
      unshieldedBalances,
      dustBalance,
      nightBalance,
    };
  } catch {
    return null;
  }
}
/** @deprecated */ export const restoreLaceWallet = restoreWalletSession;

export async function getWalletBalance(api: ConnectedAPI): Promise<WalletBalance> {
  const dust = await api.getDustBalance().catch(() => null);
  if (dust) {
    const raw = dust.balance.toString();
    return { raw, label: formatDustAmount(raw) };
  }
  return { raw: "0", label: "0 tDUST" };
}
/** @deprecated */ export const getLaceBalance = getWalletBalance;

export function startWalletBalancePolling(
  api: ConnectedAPI,
  onUpdate: (next: WalletBalance) => void,
  onError?: (error: Error) => void,
): Promise<() => void> {
  const tick = async () => {
    try { onUpdate(await getWalletBalance(api)); }
    catch (error) { onError?.(error instanceof Error ? error : new Error("Failed to refresh wallet balance")); }
  };

  const run = async () => {
    // Delay first tick to avoid rate-limiting right after the 6 connect calls.
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    await tick();
    const interval = window.setInterval(tick, 10_000);
    const onVisible = () => { if (!document.hidden) void tick(); };
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  };

  return run();
}
/** @deprecated */ export const startLaceBalancePolling = startWalletBalancePolling;

export function formatWalletKey(key: string): string {
  return key.length > 18 ? `${key.slice(0, 8)}...${key.slice(-6)}` : key;
}

export function formatDustAmount(raw: string): string {
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return `${raw} tDUST`;
  if (numeric >= 1_000_000) return `${(numeric / 1_000_000).toFixed(2)} tDUST`;
  if (numeric >= 1_000)     return `${(numeric / 1_000).toFixed(2)} tDUST`;
  return `${numeric.toFixed(2)} tDUST`;
}
/** @deprecated */ export const formatLaceAmount = formatDustAmount;

export function formatNightAmount(raw: bigint): string {
  const SCALE = 1_000_000n;
  if (raw === 0n) return "0 tNIGHT";
  const whole    = raw / SCALE;
  const fraction = raw % SCALE;
  if (fraction === 0n) return `${whole.toLocaleString()} tNIGHT`;
  const trimmed = fraction.toString().padStart(6, "0").replace(/0+$/, "");
  return `${whole.toLocaleString()}.${trimmed} tNIGHT`;
}

export function getMidnightNetworkId(): string {
  return NETWORK_ID;
}
