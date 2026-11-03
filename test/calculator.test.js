import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateScrapValue } from '../public/calculator.js';

test('calculates a price range after condition and transport costs', () => {
  const result = estimateScrapValue({
    weightKg: 20,
    minRate: 300,
    maxRate: 500,
    recoveryRate: 0.8,
    transportCost: 2_000,
  });

  assert.deepEqual(result, {
    grossMin: 4_800,
    grossMax: 8_000,
    netMin: 2_800,
    netMax: 6_000,
    verdict: 'worth_it',
  });
});

test('uses the desired minimum profit to avoid optimistic recommendations', () => {
  const result = estimateScrapValue({
    weightKg: 20,
    minRate: 300,
    maxRate: 500,
    recoveryRate: 0.8,
    transportCost: 2_000,
    minimumProfit: 5_000,
  });

  assert.equal(result.verdict, 'maybe');
});

test('rejects invalid ranges and recovery rates', () => {
  assert.throws(
    () => estimateScrapValue({ weightKg: 10, minRate: 500, maxRate: 300 }),
    /minRate must not exceed maxRate/,
  );
  assert.throws(
    () => estimateScrapValue({ weightKg: 10, minRate: 300, maxRate: 500, recoveryRate: 1.01 }),
    /recoveryRate must be at most 1/,
  );
});

test('rejects negative and non-finite numeric inputs', () => {
  assert.throws(
    () => estimateScrapValue({ weightKg: -1, minRate: 300, maxRate: 500 }),
    /weightKg must be a finite non-negative number/,
  );
  assert.throws(
    () => estimateScrapValue({ weightKg: Number.NaN, minRate: 300, maxRate: 500 }),
    /weightKg must be a finite non-negative number/,
  );
});

test('treats zero net profit as not worth collecting', () => {
  const result = estimateScrapValue({
    weightKg: 10,
    minRate: 100,
    maxRate: 100,
    transportCost: 1_000,
  });

  assert.equal(result.netMin, 0);
  assert.equal(result.netMax, 0);
  assert.equal(result.verdict, 'not_worth_it');
});
