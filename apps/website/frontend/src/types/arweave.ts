/**
 * Type definitions for Arweave-specific data structures
 */

/**
 * Arweave transaction ID (43-character base64url string)
 * Using a branded type ensures type safety and prevents passing arbitrary strings
 */
export type ArweaveTxId = string & { readonly __brand: 'ArweaveTxId' };

/**
 * Validates if a string is a valid Arweave transaction ID
 * Arweave TX IDs are 43 characters long and use base64url encoding
 *
 * @param id - String to validate
 * @returns True if the string is a valid Arweave TX ID
 */
export const isValidArweaveTxId = (id: string): id is ArweaveTxId => {
  return /^[A-Za-z0-9_-]{43}$/.test(id);
};

/**
 * Creates an ArweaveTxId from a string after validation
 *
 * @param id - String to convert to ArweaveTxId
 * @returns ArweaveTxId if valid, null otherwise
 *
 * @example
 * ```typescript
 * const txId = createArweaveTxId('abc123...');
 * if (txId) {
 *   // Use txId safely as ArweaveTxId
 * } else {
 *   // Handle invalid transaction ID
 * }
 * ```
 */
export const createArweaveTxId = (id: string): ArweaveTxId | null => {
  return isValidArweaveTxId(id) ? id : null;
};

/**
 * Unsafe: Creates an ArweaveTxId without validation
 * Only use this when you're certain the input is valid (e.g., from trusted API)
 *
 * @param id - String to convert to ArweaveTxId
 * @returns ArweaveTxId
 */
export const unsafeCreateArweaveTxId = (id: string): ArweaveTxId => {
  return id as ArweaveTxId;
};

/**
 * Generates an Arweave gateway URL for a transaction ID
 *
 * @param txId - Arweave transaction ID
 * @param gateway - Arweave gateway URL (defaults to arweave.net)
 * @returns Full URL to the transaction
 */
export const getArweaveUrl = (
  txId: ArweaveTxId,
  gateway: string = 'https://arweave.net'
): string => {
  return `${gateway}/${txId}`;
};
