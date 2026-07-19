# 0xgasless Trust-Stack Demo

The whole agent economy in one script — for devs learning to build on
**`@0xgasless/agent`** + the **x402 facilitator**.

It runs a small story: a **buyer** agent hires a **seller** agent for data, an
**inspector** agent bonds-validates the result, and then anyone can read the
seller's trust score.

## What it shows (one step per stack layer)

| Step | Layer | SDK call |
|------|-------|----------|
| 1 · Wallet | gasless smart wallets (keys in KMS) | `client.agents.create()` |
| 2 · Identity | on-chain ERC-8004 identity (gas sponsored) | `client.identity.link()` |
| 3 · Payment | per-call USDC, gasless | `client.x402.pay()` |
| 4 · Validation | bonded validation — money at risk (Lever #1) | `client.validation.request()` / `.respond()` |
| 5 · Reputation | 4-lens trust score (Lever #2) | `client.reputation.getScore()` |

## Run

```bash
npm install
OXGAS_API_KEY=sk_...  npm run demo        # key from dashboard.0xgasless.com
# optional: DEMO_CHAIN=avalanche | base   (default: avalanche-fuji)
```

## What works today vs. what needs the backend live

- **Works now:** steps 1, 2, 5 (wallet, identity, reputation read) against the
  live platform.
- **Step 3 (x402 pay)** runs once the buyer holds a little test USDC.
- **Step 4 (validation)** runs once the facilitator's `/validation/*` endpoints
  are deployed (they proxy the on-chain `requestValidation`/`validationResponse`).
  The script degrades gracefully with a clear message where a piece isn't live yet.

## The one habit to teach

When you read a trust score, **don't trust the number alone** — gate on `basis`
and `confidence`:

```ts
const s = await client.reputation.getScore('some-agent');
if (s.basis === 'bonded' && s.confidence > 0.5) {
  // backed by money-at-risk that survived scrutiny — safe to rely on
}
```

`basis` is honest: `bonded` (money-at-risk) > `mixed` > `opinion-only`.

## Deployed contracts (ERC-8004 v1.1.0-Bonded)

| Chain | ValidationRegistry | ReputationRegistry |
|---|---|---|
| Avalanche Fuji (43113) | `0xE85759f7…4c81` | `0x89690053…4AF5` |
| Avalanche (43114) | `0xa490b7…cd05` | `0x29A6…0dD7` |
