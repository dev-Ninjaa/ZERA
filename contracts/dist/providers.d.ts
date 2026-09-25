import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { MidnightWalletProvider } from './wallet';
import { type NetworkConfig } from './config';
export type ZeraCircuits = 'registerAsset' | 'verifyAsset' | 'assetExists' | 'getAsset' | 'assignOwnership' | 'transferOwnership' | 'verifyOwnership';
export type ZeraProviders = MidnightProviders<any>;
export declare function buildProviders(wallet: MidnightWalletProvider, zkConfigPath: string, config: NetworkConfig): ZeraProviders;
