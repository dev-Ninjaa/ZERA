import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
export function buildProviders(wallet, zkConfigPath, config) {
    const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
    return {
        privateStateProvider: levelPrivateStateProvider({
            privateStateStoreName: `zera-asset-registry-db`,
            privateStoragePasswordProvider: () => 'Zera-Asset-Registry-Test-Password',
            accountId: wallet.getCoinPublicKey(),
        }),
        publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
        zkConfigProvider,
        proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
        walletProvider: wallet,
        midnightProvider: wallet,
    };
}
//# sourceMappingURL=providers.js.map