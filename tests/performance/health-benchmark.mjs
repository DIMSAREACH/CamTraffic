#!/usr/bin/env node
/**
 * Task 119 — Lightweight health endpoint benchmark.
 * Usage: node tests/performance/health-benchmark.mjs
 */

const baseUrl = process.env.CAMTRAFFIC_BASE_URL ?? 'http://localhost:8000';
const iterations = Number(process.env.CAMTRAFFIC_PERF_ITERATIONS ?? 30);
const p95ThresholdMs = Number(process.env.CAMTRAFFIC_PERF_P95_MS ?? 250);

async function measureHealth() {
  const start = performance.now();
  const response = await fetch(`${baseUrl}/health/`);
  const elapsed = performance.now() - start;

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return elapsed;
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function main() {
  const samples = [];

  for (let index = 0; index < iterations; index += 1) {
    samples.push(await measureHealth());
  }

  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const p95 = percentile(samples, 95);
  const max = Math.max(...samples);

  console.log(`Health benchmark (${iterations} requests → ${baseUrl}/health/)`);
  console.log(`  avg: ${average.toFixed(2)} ms`);
  console.log(`  p95: ${p95.toFixed(2)} ms`);
  console.log(`  max: ${max.toFixed(2)} ms`);

  if (p95 > p95ThresholdMs) {
    console.error(`Performance threshold exceeded: p95 ${p95.toFixed(2)} ms > ${p95ThresholdMs} ms`);
    process.exit(1);
  }

  console.log('Performance benchmark PASSED.');
}

main().catch((error) => {
  console.error(`Performance benchmark failed: ${error.message}`);
  console.error('Ensure the backend is running or set CAMTRAFFIC_BASE_URL.');
  process.exit(1);
});
