import jwt from "jsonwebtoken";

import { SESSION_MAX_AGE_SECONDS } from "./constants";

export interface SessionPayload {
  adminId: string;
  email: string;
}

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new Error(
      "Falta JWT_SECRET. Genera uno con: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  return value;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, secret(), { expiresIn: SESSION_MAX_AGE_SECONDS });
}

/**
 * Devuelve el payload si el token es válido y no expiró, `null` en cualquier
 * otro caso. Nunca lanza: quien la llama solo quiere saber si hay sesión.
 */
export function verifySessionToken(
  token: string | undefined,
): SessionPayload | null {
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, secret());
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      typeof (decoded as SessionPayload).adminId === "string" &&
      typeof (decoded as SessionPayload).email === "string"
    ) {
      const { adminId, email } = decoded as SessionPayload;
      return { adminId, email };
    }
    return null;
  } catch {
    return null;
  }
}
