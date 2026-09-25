export type NetworkConfig = {
    networkId: string;
    indexer: string;
    indexerWS: string;
    node: string;
    nodeWS: string;
    proofServer: string;
    faucet: string;
};
export declare const LOCAL_CONFIG: NetworkConfig;
export declare const PREPROD_CONFIG: NetworkConfig;
export declare function getConfig(): NetworkConfig;
