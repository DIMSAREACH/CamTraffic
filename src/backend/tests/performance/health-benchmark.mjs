#!/usr/bin/env node
/**
 * Health endpoint benchmark — target p95 < 250 ms (local dev baseline).
 *
 * From backend/:
 *   node tests/performance/health-benchmark.mjs
 *   node tests/performance/health-benchmark.mjs http://127.0.0.1:8000 30
 *
 * From repo root:
 *   npm run benchmark:health
 */
const baseUrl = (process.argv[2] || 'http://127.0.0.1:8000').replace(/\/$/, '');
const iterations = Math.max(5, Number(process.argv[3] || 30));

async function ping() {
  const start = performance.now();
  const res = await fetch(`${baseUrl}/health/`);
  const ms = performance.now() - start;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return ms;
}

function percentile(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function main() {
  const samples = [];
  for (let i = 0; i < iterations; i += 1) {
    samples.push(await ping());
  }
  samples.sort((a, b) => a - b);
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  const p95 = percentile(samples, 95);
  const pass = p95 < 250;
  console.log(JSON.stringify({
    baseUrl,
    iterations,
    avg_ms: Number(avg.toFixed(1)),
    p95_ms: Number(p95.toFixed(1)),
    min_ms: Number(samples[0].toFixed(1)),
    max_ms: Number(samples[samples.length - 1].toFixed(1)),
    pass,
  }, null, 2));
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
