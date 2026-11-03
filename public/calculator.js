const toFiniteNonNegative = (value, fieldName) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new RangeError(`${fieldName} must be a finite non-negative number`);
  }
  return number;
};

export function estimateScrapValue({
  weightKg,
  minRate,
  maxRate,
  recoveryRate = 1,
  transportCost = 0,
  minimumProfit = 0,
}) {
  const weight = toFiniteNonNegative(weightKg, 'weightKg');
  const minimum = toFiniteNonNegative(minRate, 'minRate');
  const maximum = toFiniteNonNegative(maxRate, 'maxRate');
  const recovery = toFiniteNonNegative(recoveryRate, 'recoveryRate');
  const cost = toFiniteNonNegative(transportCost, 'transportCost');
  const desiredProfit = toFiniteNonNegative(minimumProfit, 'minimumProfit');

  if (minimum > maximum) {
    throw new RangeError('minRate must not exceed maxRate');
  }
  if (recovery > 1) {
    throw new RangeError('recoveryRate must be at most 1');
  }

  const grossMin = Math.round(weight * minimum * recovery);
  const grossMax = Math.round(weight * maximum * recovery);
  const netMin = grossMin - cost;
  const netMax = grossMax - cost;

  let verdict = 'not_worth_it';
  if (netMin >= desiredProfit && netMin > 0) verdict = 'worth_it';
  else if (netMax > 0) verdict = 'maybe';

  return { grossMin, grossMax, netMin, netMax, verdict };
}
