import { DripApi } from "@dripcast/api";

/**
 * Backend base URL. Configured via EXPO_PUBLIC_API_URL; falls back to the
 * detected production API (https://se-project-express-5lx6.onrender.com).
 */
const baseUrl =
  process.env.EXPO_PUBLIC_API_URL ?? "https://se-project-express-5lx6.onrender.com";

let currentToken: string | null = null;

/** Called by the auth store whenever the JWT changes. */
export function setAuthToken(token: string | null): void {
  currentToken = token;
}

/** Current JWT (used by native uploaders that can't go through DripApi). */
export function getAuthToken(): string | null {
  return currentToken;
}

export function getBaseUrl(): string {
  return baseUrl;
}

export const api = new DripApi({
  baseUrl,
  getToken: () => currentToken,
});
