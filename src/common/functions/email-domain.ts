/**
 * True when the email host equals `domain` or is a subdomain of it.
 * Comparison is case-insensitive. The host is the text after the LAST "@".
 */
export function emailMatchesDomain(email: string, domain: string): boolean {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return false;
  const target = domain.toLowerCase();
  if (target.length === 0) return false;
  const host = email.slice(at + 1).toLowerCase();
  return host === target || host.endsWith(`.${target}`);
}
