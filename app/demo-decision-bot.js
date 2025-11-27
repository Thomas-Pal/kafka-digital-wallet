/*
 * Simple helper that pretends to be a wallet user and auto-approves/rejects
 * demo consent requests so the end-to-end flow can be demoed without manual
 * clicks. Intended to run after the DWP consent producer has emitted the
 * sample requests.
 */

const consentServiceUrl = process.env.CONSENT_URL || 'http://localhost:3000';

const demoDecisions = [
  { correlationId: 'req-1001', decision: 'approved', reason: 'Benefit check approved for demo' },
  { correlationId: 'req-1002', decision: 'rejected', reason: 'Fraud prevention not permitted (demo)' },
  { correlationId: 'req-1003', decision: 'approved', reason: 'Risk analytics allowed (demo)' }
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function seedIfNeeded() {
  try {
    const res = await fetch(`${consentServiceUrl}/api/demo/requests`, { method: 'POST' });
    if (!res.ok) throw new Error(`seed failed: ${res.status}`);
  } catch (err) {
    // Not fatal; seeding is a convenience for demos.
    console.warn('⚠️  could not seed demo requests (continuing):', err.message || err);
  }
}

async function fetchPending() {
  const res = await fetch(`${consentServiceUrl}/api/requests`);
  if (!res.ok) throw new Error(`Failed to read pending requests: ${res.status}`);
  return res.json();
}

async function submitDecision(decision) {
  const res = await fetch(`${consentServiceUrl}/api/decisions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(decision)
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to submit decision ${decision.correlationId}: ${res.status} ${body}`);
  }
}

async function run() {
  const maxAttempts = Number(process.env.MAX_ATTEMPTS || 40);
  const delayMs = Number(process.env.POLL_MS || 750);
  const fallbackAfter = Number(process.env.FALLBACK_AFTER || 6);

  await seedIfNeeded();

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const pending = await fetchPending();
      const targets = [];
      const matchedPrefixes = new Set();

      for (const req of pending) {
        const match = demoDecisions.find((d) =>
          req.correlationId === d.correlationId || req.correlationId.startsWith(`${d.correlationId}-`)
        );

        if (match && !matchedPrefixes.has(match.correlationId)) {
          matchedPrefixes.add(match.correlationId);
          targets.push({ ...match, correlationId: req.correlationId });
        }
      }

      if (!targets.length && pending.length && attempt >= fallbackAfter) {
        console.log(
          `ℹ️  no demo ID match after ${attempt} attempts; auto-approving ${pending.length} pending request(s)`
        );
        for (const req of pending) {
          targets.push({
            correlationId: req.correlationId,
            decision: 'approved',
            reason: 'Auto-approved for demo fallback'
          });
        }
      }

      if (!targets.length) {
        const pendingIds = pending.map((p) => p.correlationId).join(', ');
        console.log(
          `⏳ waiting for demo requests (have=${pending.length ? pendingIds : 'none'}, attempt ${attempt}/${maxAttempts})`
        );
        await sleep(delayMs);
        continue;
      }

      for (const decision of targets) {
        await submitDecision(decision);
        console.log(`✅ auto-decided ${decision.correlationId}: ${decision.decision}`);
      }

      return;
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      await sleep(delayMs);
    }
  }

  throw new Error('Demo decision bot timed out waiting for requests');
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
