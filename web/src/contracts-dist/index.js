import { CompiledContract } from '@midnight-ntwrk/compact-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export { Contract, ledger, pureCircuits, } from './managed/zera/contract/index.js';
import { Contract } from './managed/zera/contract/index.js';
// Get the directory of this file (contracts/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Resolve zkConfigPath relative to this contracts directory
export const zkConfigPath = path.resolve(__dirname, 'managed', 'zera');
// Base compiled contract with vacant witnesses
export const CompiledZeraContract = CompiledContract.make('ZeraAssetRegistryContract', Contract).pipe(CompiledContract.withVacantWitnesses, CompiledContract.withCompiledFileAssets(zkConfigPath));
// Legacy export for backward compatibility
export const CompiledHelloWorldContract = CompiledZeraContract;
// Factory function to create compiled contract with actual witnesses
export function createCompiledContractWithWitnesses(witnessProvider) {
    return CompiledContract.make('ZeraAssetRegistryContract', Contract).pipe((cc) => CompiledContract.withWitnesses(cc, witnessProvider), CompiledContract.withCompiledFileAssets(zkConfigPath));
}
//# sourceMappingURL=index.js.map