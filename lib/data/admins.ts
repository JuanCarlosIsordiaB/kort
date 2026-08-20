import bcrypt from "bcryptjs";

import { normalizeRole, type AdminRole } from "@/lib/auth/roles";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PublicAdmin } from "@/lib/types";

/**
 * Único lugar donde se consultan y escriben las cuentas del panel.
 *
 * Todo pasa por el service role: `admins` no es legible por anon —ahí viven los
 * `password_hash`— y no tiene ninguna policy de escritura. El hash se calcula
 * aquí y no en el route handler para que ninguna contraseña en claro salga de
 * este módulo hacia la base.
 *
 * `SELECT_COLUMNS` nunca incluye `password_hash`: lo que devuelve esta capa
 * acaba en la pantalla del panel.
 */

/*
  Las redes se enumeran a mano aunque `SOCIAL_COLUMNS` ya las tenga: supabase-js
  deduce el tipo de la fila leyendo esta cadena en tiempo de compilación, y un
  ni un `join()` ni un `+` sobreviven a eso —la ensanchan a `string`, y la
  consulta deja de estar tipada—. El precio es acordarse de sumar la columna si crece el
  catálogo; el olvido se nota de inmediato —el campo llega vacío al formulario—.
*/
const SELECT_COLUMNS =
  "id, email, display_name, avatar_url, role, is_columnist, column_name, tagline, bio, x_url, facebook_url, instagram_url, tiktok_url, youtube_url, linkedin_url, website_url, created_at";

/** Cuánto trabajo le cuesta a bcrypt cada hash. El mismo que usa seed-admin. */
const BCRYPT_ROUNDS = 12;

/** Una cuenta con lo que el panel necesita mostrar de ella. */
export interface AdminAccount extends PublicAdmin {
  /** Cuántas notas firmó. Es lo que se pierde de vista al borrarla. */
  news_count: number;
}

/**
 * El texto del perfil de columnista. Ver 0010_opinion.sql.
 *
 * Solo el texto. Las redes no pasan por aquí: se editan únicamente en
 * `/admin/perfil` —cada quien las suyas— y las valida `lib/social.ts`, que sabe
 * convertir "@fulano" en una URL y de qué dominio tiene que ser cada una.
 *
 * Esa separación no es cosmética: este módulo escribe con `update`, y toda
 * columna que aparezca en el patch se sobrescribe. Si las redes viajaran en
 * `AdminProfileInput`, editar el rol de alguien desde Usuarios —un formulario
 * que no tiene esos campos— le borraría las siete.
 */
export interface ColumnistFields {
  column_name: string | null;
  tagline: string | null;
  bio: string | null;
}

/** Lo que se puede cambiar de una cuenta que ya existe. */
export interface AdminProfileInput extends ColumnistFields {
  display_name: string;
  role: AdminRole;
  is_columnist: boolean;
  /** En claro; se hashea aquí. Ausente significa "déjala como está". */
  password?: string;
}

/** Lo que hace falta para dar de alta una nueva. */
export interface AdminAccountInput extends AdminProfileInput {
  email: string;
  password: string;
}

function toAccount(row: Record<string, unknown>): PublicAdmin {
  return { ...row, role: normalizeRole(row.role) } as PublicAdmin;
}

/**
 * El perfil de columnista tal como va a la base.
 *
 * Los tres textos van siempre, incluso en `null`: un campo que se vació tiene
 * que llegar como `null` para borrarse de verdad, y omitirlo lo dejaría con el
 * valor viejo. Por eso quien llame a esta capa tiene que mandarlos completos —y
 * por eso las redes se quedan fuera, ver `ColumnistFields`.
 */
function profilePatch(input: AdminProfileInput): Record<string, unknown> {
  return {
    is_columnist: input.is_columnist,
    column_name: input.column_name,
    tagline: input.tagline,
    bio: input.bio,
  };
}

/**
 * Todas las cuentas, con cuántas notas firmó cada una.
 *
 * El conteo va en una consulta por cuenta en vez de traerse los `author_id` de
 * toda la tabla de noticias para agruparlos en memoria: son `head: true`, no
 * devuelven filas, y aquí hablamos de un puñado de cuentas — la redacción no
 * tiene cientos.
 */
export async function listAdminAccounts(): Promise<AdminAccount[]> {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("admins")
    .select(SELECT_COLUMNS)
    .order("created_at");

  if (error) throw new Error(`No se pudieron listar las cuentas: ${error.message}`);

  return Promise.all(
    (data ?? []).map(async (row) => {
      const account = toAccount(row);
      const { count } = await supabase
        .from("news")
        .select("id", { count: "exact", head: true })
        .eq("author_id", account.id);

      return { ...account, news_count: count ?? 0 };
    }),
  );
}

export async function getAdminAccount(id: string): Promise<PublicAdmin | null> {
  const { data, error } = await supabaseAdmin()
    .from("admins")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toAccount(data) : null;
}

/** El correo es la llave con la que se entra: no puede repetirse. */
export async function adminEmailExists(email: string, exceptId?: string): Promise<boolean> {
  let query = supabaseAdmin().from("admins").select("id").eq("email", email);
  if (exceptId) query = query.neq("id", exceptId);

  const { data, error } = await query.limit(1);
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

export async function createAdminAccount(input: AdminAccountInput): Promise<PublicAdmin> {
  const { data, error } = await supabaseAdmin()
    .from("admins")
    .insert({
      email: input.email,
      display_name: input.display_name,
      role: input.role,
      ...profilePatch(input),
      password_hash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return toAccount(data);
}

/**
 * Actualiza nombre, rol y —solo si viene— la contraseña.
 *
 * El correo no se toca: es con lo que la persona entra y lo que identifica su
 * cuenta. Cambiarlo desde aquí sería, en la práctica, darle la cuenta y todas
 * sus notas firmadas a otra persona.
 */
export async function updateAdminAccount(
  id: string,
  input: AdminProfileInput,
): Promise<PublicAdmin> {
  const patch: Record<string, unknown> = {
    display_name: input.display_name,
    role: input.role,
    ...profilePatch(input),
  };

  if (input.password) {
    patch.password_hash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  }

  const { data, error } = await supabaseAdmin()
    .from("admins")
    .update(patch)
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return toAccount(data);
}

/**
 * Borra la cuenta. Sus noticias no se van con ella: `news.author_id` es
 * `on delete set null` y la byline vive desnormalizada en `news.author_name`,
 * así que lo publicado sigue publicado y sigue firmado con su nombre.
 */
export async function deleteAdminAccount(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("admins").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
