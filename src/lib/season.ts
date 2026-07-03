/**
 * Current fashion-catalog season label — "SS 2026" (Jan–Jun) or "FW 2026"
 * (Jul–Dec). Computed from the real date so hero badges never go stale again
 * instead of carrying a hand-typed year that someone has to remember to bump.
 */
export function getCurrentSeason(): string {
  const now = new Date();
  const half = now.getMonth() < 6 ? "SS" : "FW"; // getMonth() is 0-indexed: 0-5 = Jan-Jun
  return `${half} ${now.getFullYear()}`;
}
