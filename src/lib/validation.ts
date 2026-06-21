export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

export function sanitizeString(value: unknown): string {
  if (typeof value !== "string") throw new Error("Expected string");
  return value.trim();
}

/** Strip HTML tags and control characters — use for user-supplied text stored in DB */
export function sanitizeText(value: string, maxLength = 2000): string {
  return value
    .replace(/<[^>]*>/g, "")          // strip HTML tags
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "") // strip control chars
    .trim()
    .slice(0, maxLength);
}

/** Clamp a number to a valid page/limit range */
export function parsePagination(pageStr: string | null, sizeStr: string | null, maxSize = 100) {
  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, parseInt(sizeStr ?? "20", 10) || 20));
  return { page, pageSize };
}

/** Validate that a value is a positive finite number */
export function isPositiveInt(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 && Number.isInteger(v);
}

export function apiError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}
