import jwt from "jsonwebtoken";

import { SESSION_MAX_AGE_SECONDS } from "./constants";
import { isAdminRole, type AdminRole } from "./roles";

export interface SessionPayload {
  adminId: string;
  email: string;
  /**
   * Copia del rol para que el proxy pueda rebotar sin consultar la base. Es una
   * foto del momento del login: si a alguien se le cambia el rol, su token
   * sigue diciendo lo viejo hasta que vuelva a entrar. Por eso nada que escriba
   * se apoya en este campo — la palabra final la tiene el rol de la base, que
   * `getCurrentAdmin()` vuelve a leer en cada request.
   *
   * Opcional porque los tokens emitidos antes de que existieran los roles no lo
   * traen. Ausente significa "no sé": el proxy los deja pasar y la página, que
   * sí consulta la base, decide.
   */
  role?: AdminRole;
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
      const { adminId, email, role } = decoded as SessionPayload;
      return isAdminRole(role) ? { adminId, email, role } : { adminId, email };
    }
    return null;
  } catch {
    return null;
  }
}
