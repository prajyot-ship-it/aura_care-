import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { MemberRole, SessionPayload } from "./types";

const COOKIE_NAME = "aura_care_session";
const SALT_ROUNDS = 10;

function getJwtSecretKey(): Uint8Array {
  const secret =
    process.env.JWT_SECRET || "aura-care-sovereign-co-pilot-hmac-secret-2026-v1";
  return new TextEncoder().encode(secret);
}

export async function hashPasscode(passcode: string): Promise<string> {
  return bcrypt.hash(passcode, SALT_ROUNDS);
}

export async function verifyPasscode(
  passcode: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(passcode, hash);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    if (
      typeof payload.memberId === "string" &&
      typeof payload.vaultId === "string" &&
      typeof payload.vaultCode === "string" &&
      typeof payload.role === "string" &&
      typeof payload.name === "string"
    ) {
      return {
        memberId: payload.memberId,
        vaultId: payload.vaultId,
        vaultCode: payload.vaultCode,
        role: payload.role as MemberRole,
        name: payload.name,
        relationship:
          typeof payload.relationship === "string" ? payload.relationship : "",
        email: typeof payload.email === "string" ? payload.email : "",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload): Promise<string> {
  const token = await signSessionToken(payload);
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return token;
}

export function clearSessionCookie(): void {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) {
    return null;
  }
  return verifySessionToken(cookie.value);
}

export function isElderSovereign(session: SessionPayload | null): boolean {
  return session?.role === "ELDER_SOVEREIGN";
}

export function isCaretakerOrFamily(session: SessionPayload | null): boolean {
  return (
    session?.role === "PRIMARY_CARETAKER" || session?.role === "FAMILY_MEMBER"
  );
}
