import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Asset = { creatorPublicKey: Uint8Array;
                      assetHash: Uint8Array;
                      metadataHash: Uint8Array;
                      timestamp: bigint
                    };

export type Witnesses<PS> = {
  creatorSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  ownerSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  registerAsset(context: __compactRuntime.CircuitContext<PS>,
                assetHash_0: Uint8Array,
                metadataHash_0: Uint8Array,
                timestamp_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verifyAsset(context: __compactRuntime.CircuitContext<PS>,
              assetHash_0: Uint8Array,
              creatorPublicKey_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  assetExists(context: __compactRuntime.CircuitContext<PS>, id_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
  getAsset(context: __compactRuntime.CircuitContext<PS>, id_0: bigint): __compactRuntime.CircuitResults<PS, Asset>;
  assignOwnership(context: __compactRuntime.CircuitContext<PS>,
                  assetId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  transferOwnership(context: __compactRuntime.CircuitContext<PS>,
                    assetId_0: bigint,
                    newOwnerPublicKey_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyOwnership(context: __compactRuntime.CircuitContext<PS>,
                  assetId_0: bigint,
                  publicKey_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
}

export type ProvableCircuits<PS> = {
  registerAsset(context: __compactRuntime.CircuitContext<PS>,
                assetHash_0: Uint8Array,
                metadataHash_0: Uint8Array,
                timestamp_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verifyAsset(context: __compactRuntime.CircuitContext<PS>,
              assetHash_0: Uint8Array,
              creatorPublicKey_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  assetExists(context: __compactRuntime.CircuitContext<PS>, id_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
  getAsset(context: __compactRuntime.CircuitContext<PS>, id_0: bigint): __compactRuntime.CircuitResults<PS, Asset>;
  assignOwnership(context: __compactRuntime.CircuitContext<PS>,
                  assetId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  transferOwnership(context: __compactRuntime.CircuitContext<PS>,
                    assetId_0: bigint,
                    newOwnerPublicKey_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyOwnership(context: __compactRuntime.CircuitContext<PS>,
                  assetId_0: bigint,
                  publicKey_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  registerAsset(context: __compactRuntime.CircuitContext<PS>,
                assetHash_0: Uint8Array,
                metadataHash_0: Uint8Array,
                timestamp_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verifyAsset(context: __compactRuntime.CircuitContext<PS>,
              assetHash_0: Uint8Array,
              creatorPublicKey_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  assetExists(context: __compactRuntime.CircuitContext<PS>, id_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
  getAsset(context: __compactRuntime.CircuitContext<PS>, id_0: bigint): __compactRuntime.CircuitResults<PS, Asset>;
  assignOwnership(context: __compactRuntime.CircuitContext<PS>,
                  assetId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  transferOwnership(context: __compactRuntime.CircuitContext<PS>,
                    assetId_0: bigint,
                    newOwnerPublicKey_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyOwnership(context: __compactRuntime.CircuitContext<PS>,
                  assetId_0: bigint,
                  publicKey_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
}

export type Ledger = {
  readonly assetCount: bigint;
  assets: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): Asset;
    [Symbol.iterator](): Iterator<[bigint, Asset]>
  };
  commitments: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  ownershipCommitments: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): Uint8Array;
    [Symbol.iterator](): Iterator<[bigint, Uint8Array]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
