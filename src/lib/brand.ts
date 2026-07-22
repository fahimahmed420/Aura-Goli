/*
  Brand values for consumers that cannot read CSS custom properties:
  Recharts (SVG props) and email templates (inline styles for email clients).

  ⚠ Canonical pair with src/app/design-tokens.css — if a value changes there,
  it changes here. Everything else in the app must use the CSS tokens, never
  this file.
*/

export const BRAND = {
  canvas: "#0b0b14",
  surface: "#14131f",
  surfaceRaised: "#1d1b2b",

  fg: "#f7f4ec",
  fgMuted: "#a5a1b0",
  fgSubtle: "#6e6a7d",

  accent: "#c9a84c",
  accentHover: "#dcbb5e",
  accentFg: "#0b0b14",

  line: "rgba(247, 244, 236, 0.09)",
  lineStrong: "rgba(247, 244, 236, 0.18)",

  success: "#1a7f37",
  successTint: "#e6f4ea",
  warning: "#b4690e",
  warningTint: "#fdf0e3",
  danger: "#ba1a1a",
  dangerTint: "#fdecea",
} as const;

/* Recharts series colors — gold for the primary series, muted for comparison
   series, status colors only for status-meaning charts. */
export const CHART = {
  primary: BRAND.accent,
  secondary: BRAND.fgSubtle,
  tertiary: BRAND.fgMuted,
  grid: BRAND.line,
  axis: BRAND.fgSubtle,
  tooltipBg: BRAND.surfaceRaised,
  success: BRAND.success,
  warning: BRAND.warning,
  danger: BRAND.danger,
} as const;

/*
  Emails deliberately do NOT use the dark canvas as body background: dark-mode
  email clients invert unpredictably and Gmail clips heavy backgrounds. The
  brand shows up as an ink header band + gold accents on a light body.
*/
export const EMAIL = {
  headerBg: "#12103a",
  ivory: "#faf7f0",
  bodyBg: "#f2ede4",
  cardBg: "#f0ebe0",
  text: "#12103a",
  textMuted: "#5a5358",
  textSubtle: "#8a8070",
  textFaint: "#b0a898",
  line: "#e8e4dc",
  accent: BRAND.accent,
  accentFg: "#0b0b14",
  success: "#16a34a",
  warning: BRAND.warning,
  danger: BRAND.danger,
} as const;
