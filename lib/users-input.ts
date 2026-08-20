import { isAdminRole } from "@/lib/auth/roles";
import type {
  AdminAccountInput,
  AdminProfileInput,
  ColumnistFields,
} from "@/lib/data/admins";

/**
 * Valida el cuerpo que manda el formulario de usuarios. El alta y la edición
 * comparten las reglas de nombre, rol y contraseña; lo único que cambia es que
 * el alta exige correo y contraseña, y la edición no deja tocar el correo.
 *
 * Los mensajes salen tal cual en la pantalla del panel: van en español y dicen
 * qué corregir.
 */

export const MIN_PASSWORD_LENGTH = 8;

/**
 * bcrypt solo mira los primeros 72 bytes y descarta el resto en silencio. Una
 * contraseña más larga daría una falsa sensación de fuerza —dos que empiecen
 * igual abrirían la misma cuenta—, así que se rechaza en vez de recortarse.
 */
export const MAX_PASSWORD_BYTES = 72;

/**
 * Deliberadamente laxo: algo@algo.algo. Validar correos "de verdad" con una
 * expresión regular es un pozo sin fondo, y aquí el alta la hace un
 * administrador escribiendo el correo de un compañero, no un formulario
 * público.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parsePassword(value: unknown): string | null | { error: string } {
  const password = typeof value === "string" ? value : "";

  // Vacío = "no la cambies". Quien da de alta una cuenta lo resuelve aparte.
  if (!password) return null;

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` };
  }

  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return { error: "La contraseña es demasiado larga (máximo 72 caracteres)" };
  }

  return password;
}

/** Un texto opcional del perfil: recortado, vacío convertido a `null`. */
function parseOptionalText(
  value: unknown,
  label: string,
  max: number,
): string | null | { error: string } {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  if (text.length > max) return { error: `${label} es demasiado largo (máximo ${max})` };
  return text;
}

/**
 * El texto del perfil de columnista: el nombre de su columna, su frase y su
 * semblanza.
 *
 * Lo comparten `/api/perfil` (cada quien el suyo) y `/api/usuarios` (un
 * administrador el de cualquiera). Las redes NO están aquí: las valida
 * `parseSocials` en lib/social.ts, que es quien sabe de dominios y de handles.
 *
 * Tampoco está `is_columnist`: esa bandera solo se lee en la ruta de usuarios,
 * para que nadie se ascienda a columnista editando su propio perfil.
 */
export function parseColumnistFields(body: unknown): ColumnistFields | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "Cuerpo inválido" };

  const b = body as Record<string, unknown>;

  const fields: [keyof ColumnistFields, unknown, string, number][] = [
    ["column_name", b.column_name, "El nombre de la columna", 80],
    ["tagline", b.tagline, "La frase", 120],
    ["bio", b.bio, "La semblanza", 1200],
  ];

  const parsed = {} as ColumnistFields;

  for (const [key, value, label, max] of fields) {
    const result = parseOptionalText(value, label, max);
    if (result !== null && typeof result !== "string") return result;
    parsed[key] = result;
  }

  return parsed;
}

/** Nombre, rol y contraseña opcional: lo común a dar de alta y editar. */
export function parseUserProfileInput(body: unknown): AdminProfileInput | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Cuerpo inválido" };
  }

  const b = body as Record<string, unknown>;

  const displayName = typeof b.display_name === "string" ? b.display_name.trim() : "";
  if (!displayName) return { error: "Falta el nombre" };
  if (displayName.length > 120) return { error: "El nombre es demasiado largo" };

  if (!isAdminRole(b.role)) return { error: "Elige un rol válido" };

  const password = parsePassword(b.password);
  if (password !== null && typeof password !== "string") return password;

  const columnist = parseColumnistFields(body);
  if ("error" in columnist) return columnist;

  return {
    display_name: displayName,
    role: b.role,
    // Solo el panel de usuarios puede marcar a alguien como columnista; por eso
    // esta bandera se lee aquí y no en `parseColumnistFields`, que también usa
    // `/api/perfil`.
    is_columnist: b.is_columnist === true,
    ...columnist,
    ...(password ? { password } : {}),
  };
}

export function parseNewUserInput(body: unknown): AdminAccountInput | { error: string } {
  const profile = parseUserProfileInput(body);
  if ("error" in profile) return profile;

  if (!profile.password) return { error: "Falta la contraseña" };

  const b = body as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";

  if (!email) return { error: "Falta el correo" };
  if (email.length > 200) return { error: "El correo es demasiado largo" };
  if (!EMAIL_PATTERN.test(email)) return { error: "El correo no parece válido" };

  return { ...profile, email, password: profile.password };
}
