/** Tipos de las filas de Supabase. Reflejan supabase/migrations/0001_init.sql. */

export type NewsStatus = "draft" | "published";

export interface Admin {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

/** Admin sin el hash — lo que se puede mandar al cliente. */
export type PublicAdmin = Omit<Admin, "password_hash">;

export interface Category {
  id: string;
  name: string;
  slug: string;
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
}

/** Lo que el panel manda al guardar: sin id, porque se reemplazan todas. */
export interface NewsImageInput {
  url: string;
  alt: string | null;
  visible: boolean;
}

/** Noticia con su categoría ya resuelta por el join. */
export interface NewsWithCategory extends News {
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
