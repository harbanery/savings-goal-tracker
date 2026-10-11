import { OAuth2Client } from "google-auth-library";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
} from "@/utils/config/variables";

/**
 * Google OAuth 2.0 (server-side) — pola sama dengan tourism-village:
 * - /api/web/auth/google/start  → 302 ke consent Google (state anti-CSRF).
 * - /api/web/auth/google/callback → tukar code → verify id_token → login.
 *
 * Verifikasi id_token dilakukan google-auth-library (signature + audience).
 */

function oauthClient(): OAuth2Client {
  // redirectUri WAJIB ikut client agar getToken(code) mengirim
  // redirect_uri yang sama dengan consent URL — tanpa ini Google
  // menolak pertukaran code (redirect_uri_mismatch / invalid_grant).
  // (Pola sama dengan tourism-village.)
  return new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
  );
}

/** Identitas Google hasil verifikasi id_token. */
export interface GoogleIdentity {
  /** Google `sub` — stabil per akun. */
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
}

/** URL consent Google dengan parameter standar (openid email profile). */
export function buildGoogleAuthUrl(state: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("access_type", "online");
  return url.toString();
}

/** Tukar authorization code menjadi tokens + verifikasi id_token. */
export async function exchangeGoogleCode(code: string): Promise<GoogleIdentity | null> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  const idToken = tokens.id_token;
  if (!idToken) return null;

  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) return null;

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true,
    name: payload.name ?? payload.email.split("@")[0],
    picture: payload.picture ?? null,
  };
}
