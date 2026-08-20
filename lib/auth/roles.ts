/**
 * Los roles del panel y qué puede tocar cada uno.
 *
 * Sin dependencias y sin `server-only`: lo importan el proxy, los route
 * handlers, las páginas del servidor y la barra lateral en el cliente. Que la
 * tabla de permisos viva en un solo archivo es justo lo que evita que la UI
 * esconda un enlace que la API sí deja usar.
 */

export type AdminRole = "admin" | "reportero";

export const ADMIN_ROLES = ["admin", "reportero"] as const;

/** Cómo se nombra cada rol en el panel. */
export const ROLE_LABELS: Record<AdminRole, string> = {
  admin: "Administrador",
  reportero: "Reportero",
};

export function isAdminRole(value: unknown): value is AdminRole {
  return value === "admin" || value === "reportero";
}

/**
 * Cualquier cosa que no sea un rol conocido cae en `reportero`, el más
 * limitado. Un dato corrupto o una columna que todavía no existe deben quitar
 * permisos, nunca regalarlos.
 */
export function normalizeRole(value: unknown): AdminRole {
  return isAdminRole(value) ? value : "reportero";
}

/**
 * `noticias:ajenas` es poder editar o borrar una nota que firmó alguien más.
 * Crear y trabajar las propias no necesita permiso: es lo mínimo que hace
 * cualquier cuenta del panel.
 */
export type Permission =
  | "portada"
  | "secciones"
  | "publicidad"
  | "usuarios"
  | "estadisticas"
  | "noticias:ajenas";

const PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  admin: [
    "portada",
    "secciones",
    "publicidad",
    "usuarios",
    "estadisticas",
    "noticias:ajenas",
  ],
  reportero: [],
};

export function can(role: AdminRole, permission: Permission): boolean {
  return PERMISSIONS[role].includes(permission);
}

/**
 * Las rutas del panel que exigen un permiso. El proxy las usa para rebotar
 * antes de renderizar; cada página vuelve a comprobar por su cuenta, porque el
 * rol del token puede estar viejo.
 */
export const RESTRICTED_PATHS: { prefix: string; permission: Permission }[] = [
  { prefix: "/admin/portada", permission: "portada" },
  { prefix: "/admin/categorias", permission: "secciones" },
  { prefix: "/admin/publicidad", permission: "publicidad" },
  { prefix: "/admin/usuarios", permission: "usuarios" },
  { prefix: "/admin/estadisticas", permission: "estadisticas" },
];

/** El permiso que exige una ruta del panel, o `null` si la puede ver cualquiera. */
export function permissionForPath(pathname: string): Permission | null {
  const match = RESTRICTED_PATHS.find(
    (route) => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`),
  );
  return match?.permission ?? null;
}
