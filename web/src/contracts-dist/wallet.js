import { DustSecretKey, LedgerParameters, ZswapSecretKeys, Intent } from '@midnight-ntwrk/ledger-v8';
import { ttlOneHour } from '@midnight-ntwrk/midnight-js-utils';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { createKeystore, PublicKey, UnshieldedWallet, } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { InMemoryTransactionHistoryStorage } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { Buffer } from 'buffer';
import * as Rx from 'rxjs';
/**
 * Sign all unshielded offers in a transaction's intents, using the correct
 * proof marker for Intent.deserialize. This works around a bug in the wallet
 * SDK where signRecipe hardcodes 'pre-proof', which fails for proven
 * (UnboundTransaction) intents that contain 'proof' data.
 */
const signTransactionIntents = (tx, signFn, proofMarker) => {
    if (!tx.intents || tx.intents.size === 0)
        return;
    for (const segment of tx.intents.keys()) {
        const intent = tx.intents.get(segment);
        if (!intent)
            continue;
        const cloned = Intent.deserialize('signature', proofMarker, 'pre-binding', intent.serialize());
        const sigData = cloned.signatureData(segment);
        const signature = signFn(sigData);
        if (cloned.fallibleUnshieldedOffer) {
            const sigs = cloned.fallibleUnshieldedOffer.inputs.map((_, i) => cloned.fallibleUnshieldedOffer.signatures.at(i) ?? signature);
            cloned.fallibleUnshieldedOffer = cloned.fallibleUnshieldedOffer.addSignatures(sigs);
        }
        if (cloned.guaranteedUnshieldedOffer) {
            const sigs = cloned.guaranteedUnshieldedOffer.inputs.map((_, i) => cloned.guaranteedUnshieldedOffer.signatures.at(i) ?? signature);
            cloned.guaranteedUnshieldedOffer = cloned.guaranteedUnshieldedOffer.addSignatures(sigs);
        }
        tx.intents.set(segment, cloned);
    }
};
const deriveKeysFromSeed = (seed) => {
    const hdWallet = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
    if (hdWallet.type !== 'seedOk') {
        throw new Error('Failed to initialize HDWallet from seed');
    }
    const derivationResult = hdWallet.hdWallet
        .selectAccount(0)
        .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
        .deriveKeysAt(0);
    if (derivationResult.type !== 'keysDerived') {
        throw new Error('Failed to derive keys');
    }
    hdWallet.hdWallet.clear();
    return derivationResult.keys;
};
export class MidnightWalletProvider {
    logger;
    zswapSecretKeys;
    dustSecretKey;
    unshieldedKeystore;
    wallet;
    constructor(logger, wallet, zswapSecretKeys, dustSecretKey, unshieldedKeystore) {
        this.logger = logger;
        this.zswapSecretKeys = zswapSecretKeys;
        this.dustSecretKey = dustSecretKey;
        this.unshieldedKeystore = unshieldedKeystore;
        this.wallet = wallet;
    }
    getCoinPublicKey() {
        return this.zswapSecretKeys.coinPublicKey;
    }
    getEncryptionPublicKey() {
        return this.zswapSecretKeys.encryptionPublicKey;
    }
    async balanceTx(tx, ttl = ttlOneHour()) {
        const recipe = await this.wallet.balanceUnboundTransaction(tx, {
            shieldedSecretKeys: this.zswapSecretKeys,
            dustSecretKey: this.dustSecretKey,
        }, { ttl });
        const signFn = (payload) => this.unshieldedKeystore.signData(payload);
        signTransactionIntents(recipe.baseTransaction, signFn, 'proof');
        if (recipe.balancingTransaction) {
            signTransactionIntents(recipe.balancingTransaction, signFn, 'pre-proof');
        }
        return await this.wallet.finalizeRecipe(recipe);
    }
    submitTx(tx) {
        return this.wallet.submitTransaction(tx);
    }
    async start() {
        this.logger.info('Starting wallet...');
        await this.wallet.start(this.zswapSecretKeys, this.dustSecretKey);
    }
    async stop() {
        return this.wallet.stop();
    }
    static async build(logger, env, seed, initialStates) {
        const keys = deriveKeysFromSeed(seed);
        const shieldedSecretKeys = ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
        const dustSecretKey = DustSecretKey.fromSeed(keys[Roles.Dust]);
        const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], env.networkId);
        const walletConfig = {
            networkId: env.networkId,
            indexerClientConnection: {
                indexerHttpUrl: env.indexer,
                indexerWsUrl: env.indexerWS,
            },
            provingServerUrl: new URL(env.proofServer),
            relayURL: new URL(env.nodeWS ?? env.node.replace(/^http/, 'ws')),
            txHistoryStorage: Object.assign((schema) => Promise.resolve(new InMemoryTransactionHistoryStorage(schema)), { create: (schema) => Promise.resolve(new InMemoryTransactionHistoryStorage(schema)) }),
            costParameters: {
                additionalFeeOverhead: 300000000000000n,
                feeBlocksMargin: 5,
                ledgerParams: LedgerParameters.initialParameters().dust
            }
        };
        const wallet = await WalletFacade.init({
            configuration: walletConfig,
            shielded: (cfg) => {
                const w = ShieldedWallet(cfg);
                if (initialStates?.shielded) {
                    logger.info('Restoring shielded wallet state...');
                    return w.restore(initialStates.shielded);
                }
                return w.startWithSecretKeys(shieldedSecretKeys);
            },
            unshielded: (cfg) => {
                const w = UnshieldedWallet(cfg);
                if (initialStates?.unshielded) {
                    logger.info('Restoring unshielded wallet state...');
                    return w.restore(initialStates.unshielded);
                }
                return w.startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore));
            },
            dust: (cfg) => {
                const w = DustWallet(cfg);
                if (initialStates?.dust) {
                    logger.info('Restoring dust wallet state...');
                    return w.restore(initialStates.dust);
                }
                return w.startWithSecretKey(dustSecretKey, LedgerParameters.initialParameters().dust);
            },
        });
        logger.info(`Wallet built from seed: ${seed.slice(0, 8)}...`);
        return new MidnightWalletProvider(logger, wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore);
    }
    async serializeStates() {
        const states = {};
        try {
            states.unshielded = await this.wallet.unshielded.serializeState();
        }
        catch (e) {
            this.logger.warn('Failed to serialize unshielded state');
        }
        try {
            states.shielded = await this.wallet.shielded.serializeState();
        }
        catch (e) {
            this.logger.warn('Failed to serialize shielded state');
        }
        try {
            states.dust = await this.wallet.dust.serializeState();
        }
        catch (e) {
            this.logger.warn('Failed to serialize dust state');
        }
        return states;
    }
}
function isProgressStrictlyComplete(progress) {
    if (!progress || typeof progress !== 'object') {
        return false;
    }
    const candidate = progress;
    if (typeof candidate.isStrictlyComplete !== 'function') {
        return false;
    }
    return candidate.isStrictlyComplete();
}
export async function syncWallet(logger, wallet, timeout = 300_000) {
    logger.info('Syncing wallet...');
    let emissionCount = 0;
    return Rx.firstValueFrom(wallet.state().pipe(Rx.tap((state) => {
        emissionCount++;
        const shielded = isProgressStrictlyComplete(state.shielded.state.progress);
        const unshielded = isProgressStrictlyComplete(state.unshielded.progress);
        const dust = isProgressStrictlyComplete(state.dust.state.progress);
        logger.info(`Wallet sync [${emissionCount}]: shielded=${shielded}, unshielded=${unshielded}, dust=${dust}`);
    }), Rx.filter((state) => isProgressStrictlyComplete(state.shielded.state.progress) &&
        isProgressStrictlyComplete(state.dust.state.progress) &&
        isProgressStrictlyComplete(state.unshielded.progress)), Rx.tap(() => logger.info(`Wallet sync complete after ${emissionCount} emissions`)), Rx.timeout({
        each: timeout,
        with: () => Rx.throwError(() => new Error(`Wallet sync timeout after ${timeout}ms (${emissionCount} emissions received)`)),
    }), Rx.catchError((err) => {
        logger.error(`Wallet sync error: ${err}`);
        return Rx.throwError(() => err);
    })));
}
//# sourceMappingURL=wallet.js.map