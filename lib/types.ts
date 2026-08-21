/** Tipos de las filas de Supabase. Reflejan supabase/migrations/0001_init.sql. */

import type { AdminRole } from "@/lib/auth/roles";

export type NewsStatus = "draft" | "published";

/**
 * Qué clase de sección es. Solo puede haber una `opinion` —lo garantiza un
 * índice parcial en 0010_opinion.sql— y es la que se lista en `/opinion`.
 */
export type CategoryKind = "noticia" | "opinion";

export interface Admin {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  avatar_url: string | null;
  /** Qué puede tocar en el panel. Ver 0008_roles.sql y lib/auth/roles.ts. */
  role: AdminRole;
  /**
   * Perfil público de columnista. Ver 0010_opinion.sql.
   *
   * Es ortogonal a `role`: un columnista puede ser `reportero` o `admin`. Esto
   * no da permisos, decide cómo se le presenta al lector — su nombre encabeza
   * la tarjeta y tiene página propia en `/opinion/[slug]`.
   */
  is_columnist: boolean;
  /** El nombre permanente de su columna, ej. "Ecos de la Sierra". */
  column_name: string | null;
  /** Una línea que lo describe, bajo su nombre. */
  tagline: string | null;
  /** Semblanza, para la cabecera de su perfil. */
  bio: string | null;
  /**
   * Las redes sociales, una columna por red. Ver 0011_redes.sql y el catálogo
   * de `lib/social.ts`, que es lo que decide qué columna es cuál. Siempre
   * guardan una URL completa ya validada, nunca un "@usuario".
   */
  x_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  created_at: string;
}

/** Admin sin el hash — lo que se puede mandar al cliente. */
export type PublicAdmin = Omit<Admin, "password_hash">;

export interface Category {
  id: string;
  name: string;
  slug: string;
  kind: CategoryKind;
  created_at: string;
}

export interface News {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  /** JSON de Tiptap, para re-editar. */
  content: unknown | null;
  /** HTML renderizado, para mostrar en público. */
  content_html: string | null;
  cover_image_url: string | null;
  /** Encuadre de la portada, copiado de su imagen. Ver 0007_encuadre.sql. */
  cover_focus_x: number;
  cover_focus_y: number;
  category_id: string | null;
  status: NewsStatus;
  author_id: string | null;
  /** Desnormalizado: ver el comentario en la migración. */
  author_name: string | null;
  /** Desnormalizado también, pero este sí se propaga al cambiar de foto. */
  author_avatar_url: string | null;
  read_minutes: number | null;
  view_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Una foto de la galería de una nota. */
export interface NewsImage {
  id: string;
  news_id: string;
  url: string;
  alt: string | null;
  position: number;
  visible: boolean;
  /** Punto de la foto que nunca se recorta, en % (0-100). 50/50 es el centro. */
  focus_x: number;
  focus_y: number;
}

/** Lo que el panel manda al guardar: sin id, porque se reemplazan todas. */
export interface NewsImageInput {
  url: string;
  alt: string | null;
  visible: boolean;
  focus_x: number;
  focus_y: number;
}

/** Noticia con su categoría ya resuelta por el join. */
export interface NewsWithCategory extends News {
  category: Pick<Category, "id" | "name" | "slug"> | null;
}

/**
 * Lo mínimo para pintar una nota en el buscador del panel: el renglón de una
 * lista de resultados, no la nota entera.
 *
 * Existe porque los selectores de portada y de recomendadas dejaron de recibir
 * el catálogo completo. Mandar `NewsWithCategory` ahí arrastraría el extracto y
 * la portada de cada resultado por nada.
 */
export interface NewsOption {
  id: string;
  title: string;
  status: NewsStatus;
  published_at: string | null;
  updated_at: string;
  category: Pick<Category, "id" | "name" | "slug"> | null;
}

/** Noticia con su galería, para el detalle. */
export interface NewsWithImages extends NewsWithCategory {
  images: NewsImage[];
}

/** Página de resultados del listado público. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageCount: number;
}

/**
 * Un día de tráfico del sitio. Refleja supabase/migrations/0009_estadisticas.sql.
 *
 * `views` son páginas vistas (recargar cuenta otra vez) y `sessions` visitas:
 * la primera página que abre un navegador en su sesión.
 */
export interface SiteViewDay {
  /** "YYYY-MM-DD" en la zona del sitio. */
  day: string;
  views: number;
  sessions: number;
}

/** Un día de lecturas de una nota. */
export interface NewsViewDay {
  news_id: string;
  day: string;
  views: number;
}

/**
 * Una campaña de publicidad. Refleja supabase/migrations/0006_ads.sql.
 *
 * `zone` es una de las claves de `AD_ZONES` (lib/ad-zones.ts); no se tipa como
 * `AdZone` aquí para que este módulo siga siendo puro reflejo de la base.
 */
export interface Ad {
  id: string;
  /** Empresa que contrató el espacio. */
  advertiser: string;
  zone: string;
  image_url: string;
  target_url: string;
  alt: string | null;
  /** "YYYY-MM-DD", ambos inclusive. */
  starts_on: string;
  ends_on: string;
  /** Pausa manual, independiente de las fechas. */
  active: boolean;
  click_count: number;
  /** Notas internas del vendedor; nunca salen al público. */
  notes: string | null;
  created_at: string;
  updated_at: string;
}
