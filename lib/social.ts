/**
 * Las redes sociales de quien firma.
 *
 * El catálogo vive en código y no en la base, igual que las zonas de
 * publicidad: son siete opciones que cambian una vez cada varios años, y
 * tenerlas aquí es lo que permite que el formulario del panel, la validación
 * del servidor y la página pública lean exactamente la misma lista.
 *
 * Cada red es una columna de `admins` y no una llave dentro de un `jsonb`.
 * Tres de ellas —`x_url`, `facebook_url`, `website_url`— ya existían de
 * 0010_opinion.sql; convertirlas a JSON habría sido migrar datos ajenos para
 * ganar nada, porque el catálogo es cerrado y una columna por red se lee, se
 * indexa y se consulta como cualquier otro campo del perfil.
 *
 * Este módulo no importa nada a propósito: lo usan el formulario (cliente), el
 * route handler que guarda (servidor) y la página del reportero (servidor), y
 * por eso no puede tocar Supabase ni `server-only`.
 */

/** Los ids del catálogo, en el orden en que se pintan siempre. */
export const SOCIAL_IDS = [
  "x",
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "linkedin",
  "web",
] as const;

export type SocialId = (typeof SOCIAL_IDS)[number];

/**
 * Las que tienen sentido para el periódico mismo.
 *
 * Es el catálogo menos "web": el sitio web de Kort es Kort, y ese campo en el
 * formulario de ajustes sólo invitaría a poner un enlace que apunta a la misma
 * página en la que está el lector. Las cuentas de la redacción viven en
 * `site_settings` (0013_redes_del_sitio.sql), las de cada firma en `admins`.
 */
export const SITE_SOCIAL_IDS: readonly SocialId[] = SOCIAL_IDS.filter(
  (id) => id !== "web",
);

/**
 * Las columnas de `admins` donde viven. Es un tipo y no `string` para que
 * cualquier fila que ya traiga estos campos —`PublicReporter`, el admin de la
 * sesión— se pueda pasar a `socialList` sin convertirla ni ensancharla.
 */
export type SocialColumn =
  | "x_url"
  | "facebook_url"
  | "instagram_url"
  | "tiktok_url"
  | "youtube_url"
  | "linkedin_url"
  | "website_url";

/** Una fila vista solo por sus columnas de redes. */
export type SocialFields = Record<SocialColumn, string | null>;

interface SocialNetwork {
  label: string;
  /** La columna de `admins` donde vive. Ver 0010_opinion.sql y 0011_redes.sql. */
  column: SocialColumn;
  /**
   * A qué se le pega el usuario cuando alguien escribe "@fulano" en vez de una
   * URL. `null` significa que esta red no acepta usuario suelto: en un sitio
   * web personal no hay nada que construir.
   */
  base: string | null;
  /**
   * Dominios que se aceptan al pegar una URL completa. Vacío = cualquiera, que
   * es el caso de "web". Se comparan sin `www.` y contando los subdominios
   * (`m.facebook.com` entra por `facebook.com`).
   */
  hosts: string[];
  placeholder: string;
}

export const SOCIAL_NETWORKS: Record<SocialId, SocialNetwork> = {
  x: {
    label: "X",
    column: "x_url",
    base: "https://x.com/",
    hosts: ["x.com", "twitter.com"],
    placeholder: "@usuario",
  },
  facebook: {
    label: "Facebook",
    column: "facebook_url",
    base: "https://facebook.com/",
    hosts: ["facebook.com", "fb.com", "fb.me"],
    placeholder: "usuario o enlace del perfil",
  },
  instagram: {
    label: "Instagram",
    column: "instagram_url",
    base: "https://instagram.com/",
    hosts: ["instagram.com"],
    placeholder: "@usuario",
  },
  tiktok: {
    label: "TikTok",
    column: "tiktok_url",
    base: "https://tiktok.com/@",
    hosts: ["tiktok.com"],
    placeholder: "@usuario",
  },
  youtube: {
    label: "YouTube",
    column: "youtube_url",
    base: "https://youtube.com/@",
    hosts: ["youtube.com", "youtu.be"],
    placeholder: "@canal o enlace",
  },
  linkedin: {
    label: "LinkedIn",
    column: "linkedin_url",
    base: "https://linkedin.com/in/",
    hosts: ["linkedin.com"],
    placeholder: "usuario o enlace del perfil",
  },
  web: {
    label: "Sitio web",
    column: "website_url",
    base: null,
    hosts: [],
    placeholder: "https://misitio.com",
  },
};

/** Las siete columnas, para `select` y para armar el `update`. */
export const SOCIAL_COLUMNS: SocialColumn[] = SOCIAL_IDS.map(
  (id) => SOCIAL_NETWORKS[id].column,
);

/**
 * Un usuario, no una frase. Sirve para las seis redes que dejan escribir
 * "@fulano": si trae espacios, acentos o barras, es otra cosa y se rechaza en
 * vez de convertirse en una URL rota.
 */
const HANDLE_PATTERN = /^[A-Za-z0-9._-]{1,60}$/;

/** El tope. Más largo que eso no es un perfil, es basura. */
const MAX_LENGTH = 300;

function hostMatches(hostname: string, hosts: string[]): boolean {
  if (hosts.length === 0) return true;
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

/**
 * Convierte lo que se escribió en una URL guardable, o dice qué está mal.
 *
 * Acepta las dos formas en que la gente da su red: el usuario ("@fulano", que
 * es como se lo sabe de memoria) y la URL pegada de la barra del navegador. La
 * primera se arma sobre `base`; la segunda tiene que ser http/https —lo único
 * que impide guardar un `javascript:` que después renderizaríamos como `href`
 * en una página pública— y además apuntar al dominio de esa red: sin esa
 * segunda comprobación cualquiera podría colgar su sitio bajo la etiqueta
 * "Instagram", y el lector daría clic creyendo otra cosa.
 *
 * Devuelve `null` para el campo vacío, que es lo que significa "quítala".
 */
export function normalizeSocial(
  id: SocialId,
  raw: string,
): string | null | { error: string } {
  const network = SOCIAL_NETWORKS[id];
  const value = raw.trim();

  if (!value) return null;
  if (value.length > MAX_LENGTH) {
    return { error: `El enlace de ${network.label} es demasiado largo` };
  }

  // Con protocolo se trata como URL; sin él, como usuario. El caso intermedio
  // —"instagram.com/fulano"— no es ninguna de las dos y cae en el error de
  // abajo, que es lo correcto: adivinarle el protocolo a la persona es
  // justamente lo que abre el hueco que cierra la validación.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return { error: `El enlace de ${network.label} no es una dirección válida` };
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { error: `El enlace de ${network.label} debe empezar con https://` };
    }

    if (!hostMatches(url.hostname, network.hosts)) {
      return {
        error: `Ese enlace no es de ${network.label}. Revisa que lo copiaste de la red correcta.`,
      };
    }

    return url.toString();
  }

  if (!network.base) {
    return { error: "El sitio web tiene que empezar con https://" };
  }

  const handle = value.replace(/^@/, "");
  if (!HANDLE_PATTERN.test(handle)) {
    return {
      error: `El usuario de ${network.label} solo puede llevar letras, números, puntos, guiones y guion bajo`,
    };
  }

  return `${network.base}${handle}`;
}

/**
 * Valida las columnas de redes del cuerpo que manda el formulario.
 *
 * Devuelve siempre una entrada por cada red de `ids`, con `null` en las vacías,
 * para que el `update` pueda pasarlas tal cual: un campo que se borró tiene que
 * llegar como `null` a la base, y omitirlo lo dejaría con el valor viejo.
 *
 * `ids` acota el catálogo a las columnas que existen en la tabla destino:
 * `admins` tiene las siete y `site_settings` sólo las seis de
 * `SITE_SOCIAL_IDS`. El tipo de retorno es parcial porque el subconjunto lo
 * elige quien llama; dentro del subconjunto la garantía de arriba se mantiene.
 */
export function parseSocials(
  body: unknown,
  ids: readonly SocialId[] = SOCIAL_IDS,
): Partial<SocialFields> | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Las redes sociales llegaron en un formato inesperado" };
  }

  const input = body as Record<string, unknown>;
  const fields: Partial<SocialFields> = {};

  for (const id of ids) {
    const { column, label } = SOCIAL_NETWORKS[id];
    const raw = input[column];

    if (raw === undefined || raw === null) {
      fields[column] = null;
      continue;
    }
    if (typeof raw !== "string") {
      return { error: `El enlace de ${label} no es texto` };
    }

    const normalized = normalizeSocial(id, raw);
    if (normalized !== null && typeof normalized !== "string") return normalized;
    fields[column] = normalized;
  }

  return fields;
}

/**
 * Lo guardado, listo para pintar: en el orden del catálogo y sin las vacías.
 *
 * El orden es el del catálogo y no el de las columnas que trajo la consulta,
 * para que la fila de enlaces no baile entre un perfil y otro.
 *
 * Cada URL se vuelve a comprobar aquí aunque ya se validó al guardar. No es
 * desconfianza del formulario: es que esta función es la que produce el `href`,
 * y una fila editada a mano en el SQL editor de Supabase nunca pasó por
 * `normalizeSocial`. La comprobación del lado que renderiza es la que cuenta.
 */
export interface SocialLink {
  id: SocialId;
  label: string;
  url: string;
}

export function socialList(
  source: Partial<SocialFields> | null | undefined,
): SocialLink[] {
  if (!source) return [];

  return SOCIAL_IDS.flatMap((id) => {
    const network = SOCIAL_NETWORKS[id];
    const value = source[network.column];
    if (typeof value !== "string" || !value) return [];

    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") return [];
    } catch {
      return [];
    }

    return [{ id, label: network.label, url: value }];
  });
}
