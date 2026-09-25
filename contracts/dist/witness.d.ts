/**
 * Witness Provider for Zera Asset Registry Contract
 *
 * Witnesses are private inputs that users provide to the contract.
 * They are NOT publicly revealed on-chain but are used to generate zero-knowledge proofs.
 *
 * The Zera contract uses two witnesses:
 * 1. creatorSecretKey: 32-byte secret for asset creation (derives creatorPublicKey internally)
 * 2. ownerSecretKey: 32-byte secret for ownership operations (derives ownerPublicKey internally)
 */
import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';
/**
 * Create a 32-byte hash from an arbitrary string
 * Used to generate deterministic secret keys for testing
 *
 * @param input - String input to hash
 * @returns 32-byte Uint8Array
 */
export declare function createHash(input: string): Uint8Array;
/**
 * Generate cryptographically random 32 bytes
 * Used for secure witness generation in production
 *
 * @returns 32-byte random Uint8Array
 */
export declare function generateRandomSecret(): Uint8Array;
/**
 * Witness provider for a specific user/actor
 * Stores the creator and owner secrets for an identity
 */
export declare class UserWitnesses {
    private _creatorSecret;
    private _ownerSecret;
    readonly creatorSecretKey: (context: WitnessContext<unknown, unknown>) => [unknown, Uint8Array];
    readonly ownerSecretKey: (context: WitnessContext<unknown, unknown>) => [unknown, Uint8Array];
    constructor(creatorSecret?: Uint8Array, ownerSecret?: Uint8Array);
    /**
     * Get the witnesses object for contract deployment
     * Returns an object with witness functions ready for the contract
     *
     * @returns Witnesses object compatible with Contract constructor
     */
    getWitnesses(): {
        creatorSecretKey: (context: WitnessContext<unknown, unknown>) => [unknown, Uint8Array];
        ownerSecretKey: (context: WitnessContext<unknown, unknown>) => [unknown, Uint8Array];
    };
    /**
     * Get creator secret key (for debugging/testing only)
     * @returns 32-byte creator secret
     */
    getCreatorSecret(): Uint8Array;
    /**
     * Get owner secret key (for debugging/testing only)
     * @returns 32-byte owner secret
     */
    getOwnerSecret(): Uint8Array;
    /**
     * Display secrets as hex strings (for logging)
     * @returns Object with hex-encoded secrets
     */
    displaySecrets(): {
        creatorSecretKey: string;
        ownerSecretKey: string;
    };
}
/**
 * Create test witnesses using deterministic seeds
 * Useful for reproducible testing
 *
 * @param userId - Identifier for the user (e.g., "alice", "bob")
 * @returns UserWitnesses instance with deterministic secrets
 */
export declare function createTestWitnesses(userId: string): UserWitnesses;
/**
 * Create production witnesses with random secrets
 * Each call generates different secrets
 *
 * @returns UserWitnesses instance with random secrets
 */
export declare function createProductionWitnesses(): UserWitnesses;
/**
 * Helper to derive public keys from secrets
 * This mimics what the contract does internally via persistentHash()
 *
 * @param secretKey - 32-byte secret
 * @param prefix - Prefix string for the hash context
 * @returns 32-byte public key derived from secret
 */
export declare function derivePublicKey(secretKey: Uint8Array, prefix: string): Uint8Array;
/**
 * Derive creator public key from secret
 * Mirrors contract's deriveCreatorPublicKey() circuit
 *
 * @param creatorSecret - 32-byte creator secret
 * @returns 32-byte creator public key
 */
export declare function deriveCreatorPublicKey(creatorSecret: Uint8Array): Uint8Array;
/**
 * Derive owner public key from secret
 * Mirrors contract's deriveOwnerPublicKey() circuit
 *
 * @param ownerSecret - 32-byte owner secret
 * @returns 32-byte owner public key
 */
export declare function deriveOwnerPublicKey(ownerSecret: Uint8Array): Uint8Array;
/**
 * Multi-witness provider for test scenarios with multiple users
 */
export declare class MultiUserWitnesses {
    private witnesses;
    /**
     * Add a user's witnesses
     *
     * @param userId - Unique identifier for the user
     * @param userWitnesses - UserWitnesses instance for that user
     */
    addUser(userId: string, userWitnesses: UserWitnesses): void;
    /**
     * Get a user's witnesses
     *
     * @param userId - User identifier
     * @returns UserWitnesses instance or undefined if not found
     */
    getUser(userId: string): UserWitnesses | undefined;
    /**
     * Create and add a test user
     *
     * @param userId - User identifier
     * @returns Created UserWitnesses instance
     */
    createTestUser(userId: string): UserWitnesses;
    /**
     * List all registered users
     *
     * @returns Array of user IDs
     */
    listUsers(): string[];
}
