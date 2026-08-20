import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ROLE_LABELS } from "@/lib/auth/roles";
import { requirePanelPermission } from "@/lib/auth/session";
import { getAdminAccount } from "@/lib/data/admins";
import { listAllForAdmin } from "@/lib/data/news";
import { initials } from "@/lib/format";
import { SITE_TIME_ZONE } from "@/lib/site";

import { NewsRowActions } from "../../NewsRowActions";

/**
 * La ficha de una cuenta: quién es y qué ha publicado.
 *
 * Es de solo lectura a propósito. El alta, la edición y la baja siguen en el
 * listado, donde se resuelven sin cambiar de pantalla; aquí se viene a lo otro
 * —ver el trabajo que firmó alguien— que en el listado no cabía más allá de un
 * conteo.
 *
 * Exige el mismo permiso que el listado: es la misma sección, y una ficha
 * abierta por URL no puede ser la rendija que se salte el rol.
 */

const dateFormat = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: SITE_TIME_ZONE,
});

const longDateFormat = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: SITE_TIME_ZONE,
});

const numberFormat = new Intl.NumberFormat("es-MX");

export async function generateMetadata(
  props: PageProps<"/admin/usuarios/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const account = await getAdminAccount(id);
  return { title: account?.display_name ?? "Usuario" };
}

export default async function UsuarioPage(props: PageProps<"/admin/usuarios/[id]">) {
  const { id } = await props.params;

  const admin = await requirePanelPermission("usuarios");
  const account = await getAdminAccount(id);
  if (!account) notFound();

  // Todas las que firmó, borradores incluidos: quien abre esta ficha ya tiene
  // permiso sobre la redacción completa.
  const news = await listAllForAdmin({ authorId: account.id });

  const published = news.filter((item) => item.status === "published").length;
  const drafts = news.length - published;
  const views = news.reduce((total, item) => total + (item.view_count ?? 0), 0);

  const isMe = account.id === admin.id;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/usuarios" className="text-sm font-semibold text-muted underline">
        ← Usuarios
      </Link>

      <header className="mt-4 mb-8 flex flex-wrap items-center gap-4">
        {account.avatar_url ? (
          // Ya está en Supabase; <img> evita configurar next/image aquí.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={account.avatar_url}
            alt=""
            className="h-20 w-20 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-border text-xl font-extrabold text-muted">
            {initials(account.display_name)}
          </span>
        )}

        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-extrabold sm:text-3xl">
            <span className="min-w-0 break-words">{account.display_name}</span>
            <span
              className={`rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-bold ${
                account.role === "admin"
                  ? "bg-accent text-accent-foreground"
                  : "bg-chip text-muted"
              }`}
            >
              {ROLE_LABELS[account.role]}
            </span>
            {isMe && <span className="text-xs font-semibold text-muted">(tú)</span>}
          </h1>
          <p className="mt-1 break-words text-sm text-muted">{account.email}</p>
          <p className="text-sm text-muted">
            En el panel desde {longDateFormat.format(new Date(account.created_at))}
          </p>
        </div>
      </header>

      <dl className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Noticias" value={news.length} />
        <Stat label="Publicadas" value={published} />
        <Stat label="Borradores" value={drafts} />
        <Stat label="Vistas" value={views} />
      </dl>

      <h2 className="mb-4 text-lg font-extrabold">Noticias firmadas</h2>

      {news.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-border p-8 text-center text-sm text-muted">
          {isMe
            ? "Todavía no has publicado ninguna noticia."
            : `${account.display_name} todavía no ha publicado ninguna noticia.`}
        </p>
      ) : (
        <>
          {/* Mismo trato que el listado del panel: abajo de `md` la tabla
              obligaba a hacer scroll lateral para leer una sola fila. */}
          <ul className="flex flex-col gap-3 md:hidden">
            {news.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border p-4"
              >
                <p className="font-bold">{item.title}</p>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <StatusChip published={item.status === "published"} />
                  <span>{item.category?.name ?? "Sin sección"}</span>
                  <span aria-hidden>·</span>
                  <span>{dateFormat.format(new Date(item.updated_at))}</span>
                </div>

                <NewsRowActions id={item.id} slug={item.slug} status={item.status} />
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-[var(--radius-card)] border border-border md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-chip">
                <tr>
                  <th className="px-4 py-3 font-bold">Título</th>
                  <th className="px-4 py-3 font-bold">Sección</th>
                  <th className="px-4 py-3 font-bold">Estado</th>
                  <th className="px-4 py-3 font-bold">Actualizada</th>
                  <th className="px-4 py-3 font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {news.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-semibold">{item.title}</td>
                    <td className="px-4 py-3 text-muted">{item.category?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <StatusChip published={item.status === "published"} />
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {dateFormat.format(new Date(item.updated_at))}
                    </td>
                    <td className="px-4 py-3">
                      <NewsRowActions id={item.id} slug={item.slug} status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border p-4">
      <dt className="text-xs font-bold text-muted">{label}</dt>
      <dd className="text-2xl font-extrabold">{numberFormat.format(value)}</dd>
    </div>
  );
}

function StatusChip({ published }: { published: boolean }) {
  return (
    <span
      className={`rounded-[var(--radius-pill)] px-2 py-1 text-xs font-bold ${
        published ? "bg-accent text-accent-foreground" : "bg-chip text-muted"
      }`}
    >
      {published ? "Publicada" : "Borrador"}
    </span>
  );
}
