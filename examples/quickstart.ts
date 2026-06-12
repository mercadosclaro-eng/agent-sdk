/**
 * @0xgasless/agent — quickstart
 *
 * End-to-end: enable x402 on a project, create an agent, register an
 * on-chain identity, and pay a merchant. Run with:
 *
 *   OXGAS_API_KEY=0xgas_live_sk_... npx tsx examples/quickstart.ts
 *
 * Get your API key at https://dashboard.0xgasless.com → Project → Auth → API Key
 */
import { OxGasAgent, AgentApiError } from '@0xgasless/agent';

const client = new OxGasAgent({
  apiKey: process.env.OXGAS_API_KEY!,
});

async function main() {
  // 1. One-time: turn x402 on for the project. Idempotent.
  await client.policy.enableX402();

  // 2. Create an agent wallet. Idempotent on agentId.
  const agent = await client.agents.create({
    agentId:     'quickstart-bot-1',
    displayName: 'Quickstart bot',
    chain:       'fuji',                  // 'avalanche' for mainnet, 'base' for Base
  });
  console.log('Agent address (fund with USDC):', agent.address);

  // 3. (Optional) Mint an ERC-8004 on-chain identity. 0xgas pays the gas.
  const identity = await client.identity.link({ agentId: agent.agentId, chain: 'fuji' });
  console.log(`Identity #${identity.agentTokenId}  tx=${identity.txHash}`);

  // 4. Pay a merchant via x402 ($0.10 USDC). Returns the on-chain settle receipt.
  try {
    const result = await client.x402.pay({
      agentId: agent.agentId,
      to:      '0x000000000000000000000000000000000000dEaD',
      value:   '100000',                  // 0.1 USDC (6 decimals)
    });
    console.log('Settled tx:', result.settle?.transaction);
    console.log('Spent today (USD):', result.signed.policy.spentTodayUSD);
  } catch (err) {
    if (err instanceof AgentApiError && err.status === 403) {
      console.log('Hit policy cap:', err.code);
    } else {
      throw err;
    }
  }

  // 5. Inspect activity (last 7 days)
  const activity = await client.agents.activity(agent.agentId, { days: 7 });
  console.log(
    `${activity.summary.successfulSettlements} settlements, ` +
    `$${activity.summary.spentTotalUSD} total spent.`,
  );
}

main().catch((err) => { console.error(err); process.exit(1); });
