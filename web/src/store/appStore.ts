import { create } from 'zustand';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { type Asset } from '../services/assets';
import { type Collection } from '../services/collections';

export type BalanceBreakdown = {
  shielded: Record<string, string>;
  unshielded: Record<string, string>;
  dust: string;
  night: { shielded: string; unshielded: string; total: string };
};

const EMPTY_BREAKDOWN: BalanceBreakdown = {
  shielded: {},
  unshielded: {},
  dust: '0 tDUST',
  night: { shielded: '0 tNIGHT', unshielded: '0 tNIGHT', total: '0 tNIGHT' },
};

interface AppState {
  // ── Wallet session — all shared so every useWallet() caller sees the same values ──
  walletAddress: string | null;
  walletBalance: string;
  isConnected: boolean;
  isRestoring: boolean;
  walletApi: ConnectedAPI | null;
  walletNetworkId: string | null;
  unshieldedAddress: string | null;
  shieldedAddress: string | null;
  dustAddress: string | null;
  balanceBreakdown: BalanceBreakdown;

  // ── Assets state ──
  uploadedAssets: Asset[];
  ownedAssets: Asset[];

  // ── Collections state ──
  collections: Collection[];

  // ── Loading states ──
  isLoadingAssets: boolean;
  isLoadingCollections: boolean;
  isUploading: boolean;

  // ── Actions ──
  setWalletAddress: (address: string | null) => void;
  setWalletBalance: (balance: string) => void;
  setIsConnected: (connected: boolean) => void;
  setIsRestoring: (restoring: boolean) => void;
  setWalletApi: (api: ConnectedAPI | null) => void;
  setWalletNetworkId: (id: string | null) => void;
  setUnshieldedAddress: (addr: string | null) => void;
  setShieldedAddress: (addr: string | null) => void;
  setDustAddress: (addr: string | null) => void;
  setBalanceBreakdown: (breakdown: BalanceBreakdown) => void;

  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;

  setUploadedAssets: (assets: Asset[]) => void;
  addUploadedAsset: (asset: Asset) => void;
  setOwnedAssets: (assets: Asset[]) => void;

  setCollections: (collections: Collection[]) => void;
  addCollection: (collection: Collection) => void;

  setIsLoadingAssets: (loading: boolean) => void;
  setIsLoadingCollections: (loading: boolean) => void;
  setIsUploading: (uploading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Wallet
  walletAddress: null,
  walletBalance: '0 tDUST',
  isConnected: false,
  isRestoring: false,
  walletApi: null,
  walletNetworkId: null,
  unshieldedAddress: null,
  shieldedAddress: null,
  dustAddress: null,
  balanceBreakdown: EMPTY_BREAKDOWN,

  // Assets
  uploadedAssets: [],
  ownedAssets: [],

  // Collections
  collections: [],

  // Loading
  isLoadingAssets: false,
  isLoadingCollections: false,
  isUploading: false,

  // Wallet actions
  setWalletAddress: (address) => set({ walletAddress: address }),
  setWalletBalance: (walletBalance) => set({ walletBalance }),
  setIsConnected: (isConnected) => set({ isConnected }),
  setIsRestoring: (isRestoring) => set({ isRestoring }),
  setWalletApi: (walletApi) => set({ walletApi }),
  setWalletNetworkId: (walletNetworkId) => set({ walletNetworkId }),
  setUnshieldedAddress: (unshieldedAddress) => set({ unshieldedAddress }),
  setShieldedAddress: (shieldedAddress) => set({ shieldedAddress }),
  setDustAddress: (dustAddress) => set({ dustAddress }),
  setBalanceBreakdown: (balanceBreakdown) => set({ balanceBreakdown }),

  connectWallet: async () => {
    throw new Error('Use connectWallet() from useWallet() instead of the store stub.');
  },

  disconnectWallet: () => {
    set({
      walletAddress: null,
      walletBalance: '0 tDUST',
      isConnected: false,
      isRestoring: false,
      walletApi: null,
      walletNetworkId: null,
      unshieldedAddress: null,
      shieldedAddress: null,
      dustAddress: null,
      balanceBreakdown: EMPTY_BREAKDOWN,
      ownedAssets: [],
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wallet_address');
      localStorage.removeItem('wallet_connected');
    }
  },

  // Asset actions
  setUploadedAssets: (assets) => set({ uploadedAssets: assets }),
  addUploadedAsset: (asset) => set((state) => ({
    uploadedAssets: [...state.uploadedAssets, asset],
  })),
  setOwnedAssets: (assets) => set({ ownedAssets: assets }),

  // Collection actions
  setCollections: (collections) => set({ collections }),
  addCollection: (collection) => set((state) => ({
    collections: [...state.collections, collection],
  })),

  // Loading actions
  setIsLoadingAssets: (loading) => set({ isLoadingAssets: loading }),
  setIsLoadingCollections: (loading) => set({ isLoadingCollections: loading }),
  setIsUploading: (uploading) => set({ isUploading: uploading }),
}));
