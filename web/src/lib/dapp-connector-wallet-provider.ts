import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { Transaction, type CoinPublicKey, type EncPublicKey, type FinalizedTransaction, type TransactionId } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import type { MidnightProvider, UnboundTransaction, WalletProvider } from "@midnight-ntwrk/midnight-js-types";
import { fromHex, toHex } from "@midnight-ntwrk/midnight-js-utils";

export type DAppConnectorWalletProvider = WalletProvider & MidnightProvider;

export async function createDAppConnectorWalletProvider(api: ConnectedAPI): Promise<DAppConnectorWalletProvider> {
  const { shieldedCoinPublicKey, shieldedEncryptionPublicKey } = await api.getShieldedAddresses();
  return {
    getCoinPublicKey: (): CoinPublicKey => shieldedCoinPublicKey,
    getEncryptionPublicKey: (): EncPublicKey => shieldedEncryptionPublicKey,
    async balanceTx(tx: UnboundTransaction): Promise<FinalizedTransaction> {
      const { tx: balanced } = await api.balanceUnsealedTransaction(toHex(tx.serialize()));
      return Transaction.deserialize("signature", "proof", "binding", fromHex(balanced));
    },
    async submitTx(tx: FinalizedTransaction): Promise<TransactionId> {
      const [transactionId] = tx.identifiers();
      if (!transactionId) throw new Error("The balanced transaction has no identifier.");
      await api.submitTransaction(toHex(tx.serialize()));
      return transactionId;
    },
  };
}
