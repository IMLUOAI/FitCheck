/**
 * Client-side birthday validation (YYYY-MM-DD). Returns an error message
 * string when invalid, or null when the value is a valid past birthday.
 */
export function validateDob(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return "Use YYYY-MM-DD format.";
  }
  const [y, m, d] = trimmed.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // Reject impossible dates like 2001-02-30 (Date.UTC rolls them over).
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return "That's not a real calendar date.";
  }
  if (y < 1900) {
    return "Enter a birthday from 1900 or later.";
  }
  if (date.getTime() > Date.now()) {
    return "Birthday must be in the past.";
  }
  return null;
}

/** True when the value passes {@link validateDob}. */
export function isValidDob(value: string): boolean {
  return validateDob(value) === null;
}
