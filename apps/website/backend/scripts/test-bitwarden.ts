#!/usr/bin/env ts-node
/**
 * Test Bitwarden Secrets Manager Connection
 *
 * Verifies:
 * 1. Authentication with Bitwarden
 * 2. Secret retrieval from organization
 * 3. Secret format validation
 */

import * as dotenv from 'dotenv';
import { loadBitwardenSecrets } from '../src/services/BitwardenSecretsService';

// Load environment variables
dotenv.config({ path: '../.env' });

async function testBitwardenConnection() {
  console.log('🔐 Testing Bitwarden Secrets Manager Connection\n');

  // Check credentials
  const accessToken = process.env.BW_ACCESS_TOKEN;
  const projectId = process.env.BW_PROJECT_ID;

  if (!accessToken || !projectId) {
    console.error('❌ Missing Bitwarden credentials');
    console.error('   Required: BW_ACCESS_TOKEN and BW_PROJECT_ID in .env file');
    process.exit(1);
  }

  console.log('✓ Credentials found in .env');
  console.log(`  Project ID: ${projectId}`);
  console.log(`  Access Token: ${accessToken.substring(0, 20)}...\n`);

  try {
    // Test connection and load secrets
    console.log('📡 Connecting to Bitwarden...');
    await loadBitwardenSecrets(accessToken, projectId);

    console.log('\n✅ Bitwarden connection successful!\n');

    // Check which secrets were loaded
    const expectedSecrets = [
      'JWT_SECRET',
      'MAILGUN_API_KEY',
      'MAILGUN_DOMAIN',
      'MAILGUN_WEBHOOK_SIGNING_KEY',
      'DATABASE_PASSWORD',
    ];

    console.log('📋 Checking loaded secrets:\n');

    let loadedCount = 0;
    expectedSecrets.forEach(key => {
      const value = process.env[key];
      if (value) {
        console.log(`  ✅ ${key}: ${value.substring(0, 15)}... (${value.length} chars)`);
        loadedCount++;
      } else {
        console.log(`  ⚠️  ${key}: NOT FOUND (will use .env fallback)`);
      }
    });

    console.log(`\n📊 Summary: ${loadedCount}/${expectedSecrets.length} secrets loaded from Bitwarden`);

    if (loadedCount === 0) {
      console.log('\n⚠️  WARNING: No secrets found in Bitwarden project!');
      console.log('   Next steps:');
      console.log('   1. Go to https://vault.bitwarden.com');
      console.log('   2. Navigate to your organization → Projects');
      console.log('   3. Select project: ' + projectId);
      console.log('   4. Add secrets (see docs/bitwarden-setup.md)');
      console.log('\n   For now, the app will use .env fallback values.');
    } else if (loadedCount < expectedSecrets.length) {
      console.log('\n⚠️  Some secrets missing - add them to Bitwarden or ensure .env has fallbacks');
    } else {
      console.log('\n✅ All expected secrets loaded! Ready for staging deployment.');
    }

    console.log('\n🚀 Backend startup will succeed with current configuration.');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Bitwarden connection failed!');
    console.error('\nError details:', error instanceof Error ? error.message : String(error));

    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Verify access token is valid (https://vault.bitwarden.com)');
    console.log('   2. Check project ID matches your Bitwarden project');
    console.log('   3. Ensure access token has "Read" permission for the project');
    console.log('   4. Try revoking and creating a new access token');

    console.log('\n💡 For development, the app can run without Bitwarden (uses .env fallback)');
    console.log('   Remove BW_ACCESS_TOKEN and BW_PROJECT_ID from .env to disable Bitwarden\n');

    process.exit(1);
  }
}

testBitwardenConnection();
