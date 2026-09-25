import { type CoinPublicKey, type EncPublicKey, type FinalizedTransaction } from '@midnight-ntwrk/ledger-v8';
import { type MidnightProvider, type UnboundTransaction, type WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import { WalletFacade, type FacadeState } from '@midnight-ntwrk/wallet-sdk-facade';
import { type EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import type { Logger } from 'pino';
export declare class MidnightWalletProvider implements MidnightProvider, WalletProvider {
    private readonly logger;
    private readonly zswapSecretKeys;
    private readonly dustSecretKey;
    private readonly unshieldedKeystore;
    readonly wallet: WalletFacade;
    private constructor();
    getCoinPublicKey(): CoinPublicKey;
    getEncryptionPublicKey(): EncPublicKey;
    balanceTx(tx: UnboundTransaction, ttl?: Date): Promise<FinalizedTransaction>;
    submitTx(tx: FinalizedTransaction): Promise<string>;
    start(): Promise<void>;
    stop(): Promise<void>;
    static build(logger: Logger, env: EnvironmentConfiguration & {
        proofServer: string;
        faucet?: string;
    }, seed: string, initialStates?: {
        shielded?: string;
        unshielded?: string;
        dust?: string;
    }): Promise<MidnightWalletProvider>;
    serializeStates(): Promise<{
        shielded?: string;
        unshielded?: string;
        dust?: string;
    }>;
}
export declare function syncWallet(logger: Logger, wallet: WalletFacade, timeout?: number): Promise<FacadeState>;
