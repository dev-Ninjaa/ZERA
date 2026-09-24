"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAppStore } from "../store/appStore";
import {
  connectWalletSession,
  getWalletBalance,
  formatDustAmount,
  formatNightAmount,
  restoreWalletSession,
  startWalletBalancePolling,
  type WalletSession,
} from "../lib/midnight-wallet";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Module-level restore lock — prevents the two concurrent useWallet() instances
 * (WalletButton in TopBar + whatever page is open) from each kicking off their
 * own restoreWalletSession() call, which races and trips the wallet rate-limiter.
 * Only the first instance to mount claims the lock; the rest skip and read
 * the result from Zustand once it arrives.
 */
let _restoreStarted = false;

export const useWallet = () => {
  // ── All state lives in Zustand so every hook instance sees the same values ──
  const walletAddress     = useAppStore((s) => s.walletAddress);
  const walletBalance     = useAppStore((s) => s.walletBalance);
  const isConnected       = useAppStore((s) => s.isConnected);
  const isRestoring       = useAppStore((s) => s.isRestoring);
  const walletApi         = useAppStore((s) => s.walletApi);
  const walletNetworkId   = useAppStore((s) => s.walletNetworkId);
  const unshieldedAddress = useAppStore((s) => s.unshieldedAddress);
  const shieldedAddress   = useAppStore((s) => s.shieldedAddress);
  const dustAddress       = useAppStore((s) => s.dustAddress);
  const balanceBreakdown  = useAppStore((s) => s.balanceBreakdown);

  const setWalletAddress     = useAppStore((s) => s.setWalletAddress);
  const setWalletBalance     = useAppStore((s) => s.setWalletBalance);
  const setIsConnected       = useAppStore((s) => s.setIsConnected);
  const setIsRestoring       = useAppStore((s) => s.setIsRestoring);
  const setWalletApi         = useAppStore((s) => s.setWalletApi);
  const setWalletNetworkId   = useAppStore((s) => s.setWalletNetworkId);
  const setUnshieldedAddress = useAppStore((s) => s.setUnshieldedAddress);
  const setShieldedAddress   = useAppStore((s) => s.setShieldedAddress);
  const setDustAddress       = useAppStore((s) => s.setDustAddress);
  const setBalanceBreakdown  = useAppStore((s) => s.setBalanceBreakdown);

  const pollStopRef = useRef<(() => void) | null>(null);

  const stopPolling = useCallback(() => {
    pollStopRef.current?.();
    pollStopRef.current = null;
  }, []);

  const syncSessionState = useCallback(
    async (session: WalletSession) => {
      // Write all session fields to Zustand — visible to every hook instance.
      setWalletApi(session.api);
      setWalletAddress(session.address);
      setWalletNetworkId(session.networkId);
      setShieldedAddress(session.shieldedAddress);
      setUnshieldedAddress(session.unshieldedAddress);
      setDustAddress(session.dustAddress);
      setBalanceBreakdown({
        shielded: Object.fromEntries(
          Object.entries(session.shieldedBalances).map(([token, amount]) => [
            token,
            formatDustAmount(amount.toString()),
          ]),
        ),
        unshielded: Object.fromEntries(
          Object.entries(session.unshieldedBalances).map(([token, amount]) => [
            token,
            formatDustAmount(amount.toString()),
          ]),
        ),
        dust: formatDustAmount(session.dustBalance.balance.toString()),
        night: {
          shielded: formatNightAmount(session.nightBalance.shielded),
          unshielded: formatNightAmount(session.nightBalance.unshielded),
          total: formatNightAmount(session.nightBalance.total),
        },
      });
      setIsConnected(true);

      // Wait before balance fetch to avoid tripping the wallet rate-limiter
      // right after the 6 parallel calls in connectWalletSession/restoreWalletSession.
      await delay(500);
      const balance = await getWalletBalance(session.api);
      setWalletBalance(balance.label);

      stopPolling();
      pollStopRef.current = await startWalletBalancePolling(
        session.api,
        (next) => setWalletBalance(next.label),
        (err)  => console.warn("[Wallet] balance refresh failed:", err),
      );

      if (typeof window !== "undefined") {
        localStorage.setItem("wallet_address", session.address);
        localStorage.setItem("wallet_connected", "true");
      }
    },
    [
      setIsConnected, setWalletAddress, setWalletBalance, setWalletApi,
      setWalletNetworkId, setShieldedAddress, setUnshieldedAddress,
      setDustAddress, setBalanceBreakdown, stopPolling,
    ],
  );

  const connectWallet = useCallback(async () => {
    try {
      const session = await connectWalletSession();
      await syncSessionState(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to connect wallet";
      throw new Error(message);
    }
  }, [syncSessionState]);
  const disconnectWallet = useCallback(() => {
    stopPolling();
    _restoreStarted = false;
    useAppStore.getState().disconnectWallet();
  }, [stopPolling]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const shouldRestore =
      window.localStorage.getItem("wallet_connected") === "true" &&
      !isConnected &&
      !_restoreStarted;

    if (!shouldRestore) {
      return () => stopPolling();
    }

    // Claim the lock — only the first mounted instance runs the restore.
    _restoreStarted = true;
    setIsRestoring(true);

    void (async () => {
      try {
        const restored = await restoreWalletSession();
        if (restored) {
          await syncSessionState(restored);
        } else {
          // Wallet extension sleeping or unavailable — clear stale state so
          // every page shows the connect prompt instead of a broken UI.
          window.localStorage.removeItem("wallet_connected");
          window.localStorage.removeItem("wallet_address");
          setIsConnected(false);
          setWalletAddress(null);
          setWalletApi(null);
          _restoreStarted = false;
        }
      } finally {
        setIsRestoring(false);
      }
    })();

    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // deliberately run once on mount only

  return {
    walletAddress,
    walletBalance,
    walletApi,
    walletNetworkId,
    isConnected,
    isRestoring,
    shieldedAddress,
    unshieldedAddress,
    dustAddress,
    balanceBreakdown,
    isWalletAvailable:
      typeof window !== "undefined"
        ? Boolean(window.midnight && Object.keys(window.midnight).length > 0)
        : false,
    connectWallet,
    disconnectWallet,
    walletError: null as string | null,
  };
};
