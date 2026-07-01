/** Format SAR amounts without floating-point artifacts (e.g. 3.5999999999999996). */
export function formatSarAmount(amount, options = {}) {
  const { minimumFractionDigits = 0, maximumFractionDigits = 2 } = options;
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return minimumFractionDigits > 0 ? Number(0).toFixed(minimumFractionDigits) : '0';
  }
  const rounded = Math.round(value * 100) / 100;
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  });
}
