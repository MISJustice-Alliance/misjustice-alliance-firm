/**
 * Top up Turbo credits from AR balance
 *
 * Usage:
 *   npx ts-node src/scripts/topUpTurbo.ts --amount=0.5
 */

import 'dotenv/config';
import { loadBitwardenSecrets } from '../services/BitwardenSecretsService';
import { loadWalletFromEnv } from '../services/arweaveService';
import { TurboFactory } from '@ardrive/turbo-sdk';

async function main() {
  // Parse amount from args (default 0.5 AR)
  const args = process.argv.slice(2);
  const amountArg = args.find(arg => arg.startsWith('--amount='));
  const amountAR = amountArg ? parseFloat(amountArg.split('=')[1]) : 0.5;
  const amountWinston = BigInt(Math.floor(amountAR * 1_000_000_000_000));

  console.log('======================================================================');
  console.log('Turbo Credit Top-Up Script');
  console.log('======================================================================');
  console.log(`Amount: ${amountAR} AR (${amountWinston} Winston)`);

  // Load Bitwarden secrets
  const bwAccessToken = process.env.BW_ACCESS_TOKEN;
  const bwProjectId = process.env.BW_PROJECT_ID;

  if (bwAccessToken && bwProjectId) {
    console.log('\n🔐 Loading secrets from Bitwarden...');
    await loadBitwardenSecrets(bwAccessToken, bwProjectId);
    console.log('✅ Bitwarden secrets loaded');
  }

  // Load wallet
  console.log('\n📁 Loading wallet...');
  const wallet = await loadWalletFromEnv();
  if (!wallet) {
    throw new Error('No wallet found');
  }
  console.log('✅ Wallet loaded');

  // Initialize Turbo
  const turbo = TurboFactory.authenticated({ privateKey: wallet });

  // Check current balance
  const balance = await turbo.getBalance();
  console.log('\n💰 Current Turbo balance:');
  console.log(`   ${balance.winc} winc`);
  console.log(`   ${(Number(balance.winc) / 1e12).toFixed(6)} credits`);

  // Top up
  console.log(`\n📤 Topping up with ${amountAR} AR...`);
  const result = await turbo.topUpWithTokens({
    tokenAmount: amountWinston,
  });

  console.log('\n✅ Top-up submitted!');
  console.log('----------------------------------------------------------------------');
  console.log(`TX ID: ${result.id}`);
  console.log(`Amount sent: ${result.quantity} Winston (${Number(result.quantity) / 1e12} AR)`);
  console.log(`Credits to receive: ${result.winc} winc (after 23.4% fee)`);
  console.log(`Status: ${result.status}`);
  console.log('----------------------------------------------------------------------');
  console.log('\n⏳ Credits will be available after transaction confirms (~10-20 min)');
  console.log(`   Track: https://viewblock.io/arweave/tx/${result.id}`);
}

main().catch(console.error);
