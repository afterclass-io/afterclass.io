/** e$ with 2 decimals and thousands separators (single canonical money format). */
export function formatBidCurrency(n: number): string {
  return `e$${n.toLocaleString("en-SG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Short-scale e$ for tight spaces (chart axes, prediction hero). */
export function formatBidCurrencyCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `e$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) {
    const k = n / 1_000;
    const rounded = k.toFixed(1);
    // If rounding pushes us into the M band (e.g. 999.95 → "1000.0"), use M
    if (Math.abs(parseFloat(rounded)) >= 1000) {
      return `e$${(n / 1_000_000).toFixed(1)}M`;
    }
    return `e$${rounded}K`;
  }
  return formatBidCurrency(n);
}
