/**
 * Bitwarden Secrets Manager Service
 *
 * Handles secure retrieval of secrets from Bitwarden Secrets Manager.
 * Provides centralized secrets management with encryption, audit logging,
 * and team collaboration capabilities.
 *
 * Features:
 * - End-to-end AES-256 encryption
 * - Project-based secret organization
 * - Automatic secret caching in memory
 * - Environment-specific secret retrieval
 *
 * @see https://bitwarden.com/products/secrets-manager/
 */

import {
  BitwardenClient,
  SecretResponse,
} from '@bitwarden/sdk-napi';

/**
 * Secret key-value pair from Bitwarden
 */
export interface BitwardenSecret {
  key: string;
  value: string;
  note?: string;
}

/**
 * Configuration for Bitwarden Secrets Manager client
 */
export interface BitwardenConfig {
  accessToken: string;
  organizationId?: string;
  apiUrl?: string;
  identityUrl?: string;
}

/**
 * Bitwarden Secrets Manager Service
 *
 * Manages secure retrieval and caching of secrets from Bitwarden.
 */
export class BitwardenSecretsService {
  private client: BitwardenClient;
  private secretsCache: Map<string, string> = new Map();
  private initialized = false;

  /**
   * Initialize Bitwarden Secrets Manager Service
   *
   * @param config - Bitwarden configuration
   */
  constructor(private config: BitwardenConfig) {
    // Initialize Bitwarden client
    this.client = new BitwardenClient({
      apiUrl: config.apiUrl || 'https://api.bitwarden.com',
      identityUrl: config.identityUrl || 'https://identity.bitwarden.com',
      userAgent: 'MISJustice Alliance Backend',
    }, 1); // LogLevel.Info = 1
  }

  /**
   * Authenticate with Bitwarden using access token
   *
   * @throws Error if authentication fails
   */
  async authenticate(): Promise<void> {
    try {
      await this.client.auth().loginAccessToken(this.config.accessToken);
      this.initialized = true;
      console.log('✅ Bitwarden Secrets Manager authenticated successfully');
    } catch (error) {
      console.error('❌ Bitwarden authentication failed:', error);
      throw new Error(`Failed to authenticate with Bitwarden: ${error}`);
    }
  }

  /**
   * Get all secrets from a specific project (organization)
   *
   * @param organizationId - Bitwarden organization/project ID
   * @returns Array of secret key-value pairs
   */
  async getProjectSecrets(organizationId: string): Promise<BitwardenSecret[]> {
    if (!this.initialized) {
      throw new Error('Bitwarden client not authenticated. Call authenticate() first.');
    }

    try {
      // List all secret identifiers for the organization
      const listResponse = await this.client.secrets().list(organizationId);

      if (!listResponse || !listResponse.data || listResponse.data.length === 0) {
        console.warn(`⚠️ No secrets found in organization ${organizationId}`);
        return [];
      }

      // Fetch full secret details for each identifier
      const secretIds = listResponse.data.map(identifier => identifier.id);
      const fullSecretsResponse = await this.client.secrets().getByIds(secretIds);

      if (!fullSecretsResponse || !fullSecretsResponse.data) {
        console.warn(`⚠️ Failed to fetch secret details`);
        return [];
      }

      const secrets: BitwardenSecret[] = fullSecretsResponse.data.map((secret: SecretResponse) => ({
        key: secret.key,
        value: secret.value,
        note: secret.note,
      }));

      // Cache secrets in memory
      secrets.forEach(secret => {
        this.secretsCache.set(secret.key, secret.value);
      });

      // Log secret keys (not values) for debugging
      console.log(`✓ Loaded ${secrets.length} secrets from Bitwarden organization ${organizationId}`);
      console.log(`  Secret keys: ${secrets.map(s => s.key).join(', ')}`);
      return secrets;
    } catch (error) {
      console.error(`❌ Failed to fetch secrets from organization ${organizationId}:`, error);
      throw new Error(`Failed to fetch secrets: ${error}`);
    }
  }

  /**
   * Get a specific secret by key
   *
   * @param key - Secret key (e.g., "DATABASE_PASSWORD")
   * @returns Secret value or undefined if not found
   */
  getSecret(key: string): string | undefined {
    return this.secretsCache.get(key);
  }

  /**
   * Get all cached secrets as environment variables object
   *
   * @returns Object with secret keys as environment variable names
   */
  getAllSecrets(): Record<string, string> {
    const secrets: Record<string, string> = {};
    this.secretsCache.forEach((value, key) => {
      secrets[key] = value;
    });
    return secrets;
  }

  /**
   * Apply secrets to process.env
   *
   * Loads all cached secrets into process.env for application use.
   */
  applyToEnvironment(): void {
    this.secretsCache.forEach((value, key) => {
      process.env[key] = value;
    });
    console.log(`✓ Applied ${this.secretsCache.size} secrets to environment`);
  }

  /**
   * Clear cached secrets from memory
   *
   * Use when secrets need to be refreshed or on application shutdown.
   */
  clearCache(): void {
    this.secretsCache.clear();
    console.log('✓ Bitwarden secrets cache cleared');
  }

  /**
   * Get cache statistics
   *
   * @returns Number of secrets currently cached
   */
  getCacheSize(): number {
    return this.secretsCache.size;
  }
}

/**
 * Load secrets from Bitwarden and apply to environment
 *
 * Convenience function for loading secrets on application startup.
 *
 * @param accessToken - Bitwarden access token (from BW_ACCESS_TOKEN env var)
 * @param projectId - Bitwarden project ID (from BW_PROJECT_ID env var)
 * @returns Promise that resolves when secrets are loaded
 *
 * @example
 * ```typescript
 * import { loadBitwardenSecrets } from './services/BitwardenSecretsService';
 *
 * // Load secrets before starting server
 * await loadBitwardenSecrets(
 *   process.env.BW_ACCESS_TOKEN!,
 *   process.env.BW_PROJECT_ID!
 * );
 *
 * // Now all secrets are available in process.env
 * const dbPassword = process.env.DATABASE_PASSWORD;
 * ```
 */
export async function loadBitwardenSecrets(
  accessToken: string,
  projectId: string,
  organizationId?: string
): Promise<void> {
  console.log('🔐 Loading secrets from Bitwarden Secrets Manager...');

  const service = new BitwardenSecretsService({ accessToken });

  try {
    await service.authenticate();
    // Use organization ID for listing (SDK requirement), fall back to project ID
    // The access token scope already limits secrets to the project
    const listId = organizationId || process.env.BW_ORGANIZATION_ID || projectId;
    await service.getProjectSecrets(listId);
    service.applyToEnvironment();

    console.log('✅ Bitwarden secrets loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load Bitwarden secrets:', error);
    throw error;
  }
}
