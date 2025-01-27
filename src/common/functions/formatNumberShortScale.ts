interface ScaleFormatOptions extends Intl.NumberFormatOptions {
  /** Number of decimal places to show (defaults to 1) */
  decimals?: number;
}

/**
 * Formats a number using scale suffixes (K, M, B, T) with customizable options.
 *
 * @param amount - The number to format
 * @param options - Optional Intl.NumberFormat options to override defaults
 *
 * @example
 * // Basic usage
 * formatScale(1234) // "1.2K"
 * formatScale(1234567) // "1.2M"
 * formatScale(1234567890) // "1.2B"
 * formatScale(1234567890000) // "1.2T"
 *
 * // Custom decimals
 * formatScale(1234567, { decimals: 2 }) // "1.23M"
 *
 * // Override other options
 * formatScale(1234567, {
 *   notation: "compact",
 *   compactDisplay: "long"
 * }) // "1.2 million"
 *
 * @returns A formatted string with the appropriate scale suffix
 */
export function formatNumberShortScale(
  amount: number,
  options: ScaleFormatOptions | undefined = undefined,
) {
  const decimals = options?.decimals ?? 1;

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
    ...options,
  }).format(amount);
}
