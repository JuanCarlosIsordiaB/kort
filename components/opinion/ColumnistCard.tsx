import Link from "next/link";

import { profilePath } from "@/lib/data/reporters";
import type { OpinionEntry } from "@/lib/data/opinion";
import { readShortUpper, shortDateUpper, upper } from "@/lib/format";
import { punct } from "@/lib/punctuation";

import { ColumnistAvatar } from "./ColumnistAvatar";

/**
 * Una colaboración de opinión.
 *
 * Es deliberadamente lo contrario de `NewsCard`: sin foto de portada y sin
 * extracto. En una columna lo que decide si se lee no es la imagen de la nota
 * —muchas veces ni tiene—, sino quién firma; así que arriba va el columnista
 * con su foto, el nombre permanente de su columna y su nombre en grande, y
 * abajo, separado por una regla, el título de la entrega.
 *
 * Dos enlaces separados y no una tarjeta-enlace envolvente como `CardGrid`:
 * aquí hay dos destinos distintos —el perfil y la nota— y anidar enlaces no es
 * HTML válido.
 */
export function ColumnistCard({
  entry,
  variant = "listing",
}: {
  entry: OpinionEntry;
  /**
   * `profile` quita el bloque del autor: dentro de su propia página ya se sabe
   * de quién son todas las entregas y repetir su nombre en cada tarjeta lo
   * único que hace es empujar el título hacia abajo.
   */
  variant?: "listing" | "profile";
}) {
  const { columnist } = entry;

  const meta = [shortDateUpper(entry.published_at), readShortUpper(entry.read_minutes)]
    .filter(Boolean)
    .join(" — ");

  return (
    <article className="kort-reveal flex flex-col rounded-[var(--radius-card)] bg-card p-[18px] shadow-[var(--shadow-card)] transition-shadow ease-soft hover:shadow-[var(--shadow-card-hover)]">
      {variant === "listing" && (
        <>
          <div className="flex items-center gap-4">
            <ColumnistAvatar
              src={columnist?.avatar_url ?? entry.author_avatar_url}
              name={columnist?.display_name ?? entry.author_name}
              size={64}
            />

            <div className="min-w-0">
              {columnist?.column_name && (
                <div className="mb-1 text-[10px] font-extrabold tracking-[1.6px] text-accent">
                  {upper(columnist.column_name)}
                </div>
              )}

              {/* Sin columnista resuelto la byline no es enlace: la nota la
                  firmó una cuenta borrada, o alguien que ya no es columnista,
                  y `author_name` es lo único que queda de esa firma. */}
              {columnist ? (
                <Link
                  href={profilePath(columnist)}
                  className="text-xl font-extrabold leading-tight transition-colors hover:text-accent"
                >
                  {punct(columnist.display_name)}
                </Link>
              ) : (
                <span className="text-xl font-extrabold leading-tight">
                  {punct(entry.author_name ?? "")}
                </span>
              )}

              {columnist?.tagline && (
                <p className="mt-1 truncate text-xs text-muted">{punct(columnist.tagline)}</p>
              )}
            </div>
          </div>

          <hr className="my-4 border-border" />
        </>
      )}

      <Link
        href={`/noticias/${entry.slug}`}
        className="text-base font-bold leading-snug transition-colors hover:text-accent"
      >
        {punct(entry.title)}
      </Link>

      {meta && (
        <div className="mt-auto pt-3 text-[9px] font-extrabold tracking-[1.3px] text-muted">
          {meta}
        </div>
      )}
    </article>
  );
}
