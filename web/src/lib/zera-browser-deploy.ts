"use client";

import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import { dappConnectorProofProvider } from "@midnight-ntwrk/midnight-js-dapp-connector-proof-provider";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import { CostModel } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import { Contract } from "../generated/zera-contract.js";
import { createDAppConnectorWalletProvider } from "./dapp-connector-wallet-provider";

const networkId = process.env.NEXT_PUBLIC_MIDNIGHT_NETWORK_ID || "preprod";
const indexerUri = networkId === "preprod" ? "https://indexer.preprod.midnight.network/api/v4/graphql" : "http://127.0.0.1:8088/api/v4/graphql";
const indexerWsUri = networkId === "preprod" ? "wss://indexer.preprod.midnight.network/api/v4/graphql/ws" : "ws://127.0.0.1:8088/api/v4/graphql/ws";

setNetworkId(networkId);

function deploymentWitnesses() {
  const secret = () => crypto.getRandomValues(new Uint8Array(32));
  return {
    creatorSecretKey: (context: { privateState: unknown }) => [context.privateState, secret()] as [unknown, Uint8Array],
    ownerSecretKey: (context: { privateState: unknown }) => [context.privateState, secret()] as [unknown, Uint8Array],
  };
}

export async function deployZeraContract(api: ConnectedAPI, accountId: string) {
  const zkConfigProvider = new FetchZkConfigProvider(`${window.location.origin}/managed/zera`, window.fetch.bind(window));
  const walletProvider = await createDAppConnectorWalletProvider(api);
  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: "zera-asset-registry-browser-state", accountId,
      privateStoragePasswordProvider: () => "Zera-Browser-Deployment-Placeholder-1",
    }),
    publicDataProvider: indexerPublicDataProvider(indexerUri, indexerWsUri, WebSocket as unknown as NonNullable<Parameters<typeof indexerPublicDataProvider>[2]>),
    zkConfigProvider,
    proofProvider: await dappConnectorProofProvider(api, zkConfigProvider, CostModel.initialCostModel()),
    walletProvider, midnightProvider: walletProvider,
  };
  const compiledContract = (CompiledContract.make as any)("ZeraAssetRegistryContract", Contract).pipe(
    (contract: any) => (CompiledContract.withWitnesses as any)(contract, deploymentWitnesses()),
    (CompiledContract.withCompiledFileAssets as any)("zera"),
  );
  return deployContract(providers as any, {
    compiledContract, privateStateId: "zeraBrowserDeploymentPrivateState", initialPrivateState: {},
  } as any);
}
