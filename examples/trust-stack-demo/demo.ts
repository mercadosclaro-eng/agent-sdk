/**
 * 0xgasless Trust-Stack Demo
 * ==========================
 * One script that walks the whole agent-economy stack using @0xgasless/agent:
 *
 *   1. WALLET     — spin up gasless agent wallets (keys stay in 0xgas KMS)
 *   2. IDENTITY   — give an agent an on-chain ERC-8004 identity
 *   3. PAYMENT    — one agent pays another per-call via x402 (gasless USDC)
 *   4. VALIDATION — get the provider's work bonded-validated (Lever #1)
 *   5. REPUTATION — read the provider's 4-lens trust score (Lever #2)
 *
 * The cast: a BUYER agent hires a SELLER agent for data; an INSPECTOR agent
 * bonds-validates the result. Then anyone can read the seller's trust score.
 *
 * Run:  OXGAS_API_KEY=... npx tsx demo.ts
 */
import { OxGasAgent, AgentApiError } from '@0xgasless/agent';
import { createHash } from 'node:crypto';

const CHAIN = process.env.DEMO_CHAIN || 'avalanche-fuji'; // or 'avalanche' | 'base'

function log(step: string, msg: string) {
  console.log(`\n\x1b[1m[${step}]\x1b[0m ${msg}`);
}

async function main() {
  const apiKey = process.env.OXGAS_API_KEY;
  if (!apiKey) {
    console.error('Set OXGAS_API_KEY (grab one from dashboard.0xgasless.com).');
    process.exit(1);
  }

  const client = new OxGasAgent({ apiKey });

  // ── 1. WALLET ────────────────────────────────────────────────────────────
  // Enable x402 for the project once, then create three agent wallets. Keys
  // live in 0xgas KMS — your app never holds a private key, and the agents
  // never need native gas.
  log('1 · WALLET', 'Enabling x402 + creating agent wallets…');
  await client.policy.enableX402();
  const buyer     = await client.agents.create({ agentId: 'demo-buyer',     chain: CHAIN });
  const seller    = await client.agents.create({ agentId: 'demo-seller',    chain: CHAIN });
  const inspector = await client.agents.create({ agentId: 'demo-inspector', chain: CHAIN });
  console.log(`   buyer     ${buyer.address}`);
  console.log(`   seller    ${seller.address}`);
  console.log(`   inspector ${inspector.address}`);

  // ── 2. IDENTITY ──────────────────────────────────────────────────────────
  // Give the seller and inspector on-chain ERC-8004 identities (NFTs). Gas is
  // sponsored by 0xgas. Idempotent — safe to re-run.
  log('2 · IDENTITY', 'Registering ERC-8004 identities (gas sponsored)…');
  const sellerId    = await client.identity.link({ agentId: 'demo-seller' });
  const inspectorId = await client.identity.link({ agentId: 'demo-inspector' });
  console.log(`   seller    tokenId=${sellerId.agentTokenId}  tx=${sellerId.txHash.slice(0, 12)}…`);
  console.log(`   inspector tokenId=${inspectorId.agentTokenId}`);

  // ── 3. PAYMENT (x402) ─────────────────────────────────────────────────────
  // The buyer pays the seller 0.50 USDC per-call, gaslessly. Spend caps are
  // enforced by the platform before signing.
  log('3 · PAYMENT', 'Buyer pays the seller 0.50 USDC via x402…');
  try {
    const pay = await client.x402.pay({ agentId: 'demo-buyer', to: seller.address, value: '500000' });
    console.log(`   settled tx=${pay.settle?.transaction?.slice(0, 12) ?? '(sign-only)'}…`);
  } catch (e) {
    console.log(`   (skipped — fund the buyer with test USDC to run this live: ${(e as Error).message})`);
  }

  // ── 4. VALIDATION (Lever #1) ──────────────────────────────────────────────
  // The seller delivered data; the inspector bonds-validates it. A request that
  // survives its challenge window becomes a BONDED SUCCESS — a money-backed fact.
  log('4 · VALIDATION', 'Inspector bonds-validates the seller\'s work…');
  const dataURI = 'ipfs://demo/eth-price';
  const dataHash = '0x' + createHash('sha256').update('ETH=3200').digest('hex');
  try {
    const req = await client.validation.request({
      agentId: 'demo-seller', validatorId: 'demo-inspector',
      dataHash, dataURI, reward: '1000000', // 1 USDC reward to the validator
    });
    console.log(`   requestId=${req.requestId.slice(0, 14)}…  status=${req.status}`);

    const responded = await client.validation.respond({
      requestId: req.requestId, validatorId: 'demo-inspector', score: 100, evidenceURI: 'ipfs://demo/proof',
    });
    console.log(`   inspector responded: score=${responded.score}  status=${responded.status}`);
    console.log('   → after the challenge window with no dispute, this becomes a BONDED SUCCESS.');
  } catch (e) {
    console.log(`   (needs the facilitator /validation/* endpoints live: ${(e as Error).message})`);
  }

  // ── 5. REPUTATION (Lever #2) ──────────────────────────────────────────────
  // Read the seller's trust score. `basis` is honest about what backs it:
  // 'bonded' (money-at-risk) > 'mixed' > 'opinion-only'. Always gate on
  // `.confidence` and `.basis`, not just the number.
  log('5 · REPUTATION', 'Reading the seller\'s 4-lens trust score…');
  const score = await client.reputation.getScore('demo-seller');
  console.log(`   score=${score.score}/100  confidence=${score.confidence}  basis=${score.basis}`);
  console.log(`   lenses → independence=${score.breakdown.independence} recency=${score.breakdown.recency} ` +
              `bonded=${score.bondedCount} density=${score.breakdown.verificationDensity}`);

  console.log('\n\x1b[1m✓ Full stack exercised:\x1b[0m wallet → identity → x402 → validation → reputation.');
}

main().catch((e) => {
  if (e instanceof AgentApiError) console.error(`API error [${e.status}]: ${e.message}`);
  else console.error(e);
  process.exit(1);
});
