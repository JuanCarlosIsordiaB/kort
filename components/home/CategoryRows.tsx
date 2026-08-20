import Image from "next/image";
import Link from "next/link";

import type { CategoryRow } from "@/lib/data/home";
import { timeAgoUpper, upper } from "@/lib/format";
import { coverFocusStyle } from "@/lib/image-focus";
import { punct } from "@/lib/punctuation";

/**
 * Un renglón por sección con sus últimas notas al lado del nombre.
 *
 * Sustituye a la fila de chips sueltos que había bajo "AHORA EN KORT": los
 * mismos enlaces de sección siguen ahí, pero cada uno trae su contenido en vez
 * de mandar al lector a otra página para descubrir qué hay dentro.
 *
 * Los renglones van en texto y miniatura, como el sidebar de último minuto, y
 * no en tarjetas: arriba ya hay una rejilla de tarjetas y repetirla haría que
 * la portada se leyera como lo mismo dos veces.
 */
export function CategoryRows({ rows }: { rows: CategoryRow[] }) {
  if (!rows.length) return null;

  return (
    // `first:mt-0`: la rejilla de arriba desaparece cuando no hay con qué
    // llenarla, y entonces este bloque no tiene de qué separarse.
    <div className="kort-stagger mt-9 border-t border-border first:mt-0">
      {rows.map(({ category, items }) => (
        <section
          key={category.id}
          className="kort-reveal grid gap-4 border-b border-border py-6 lg:grid-cols-[190px_1fr] lg:gap-8"
        >
          {/* El nombre se queda a la vista mientras el ojo recorre las cuatro
              notas, que en pantalla angosta caen debajo. */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <Link
              href={`/categoria/${category.slug}`}
              className="inline-block rounded-[var(--radius-pill)] border border-border-strong px-4 py-2.5 text-[11px] font-extrabold tracking-[1.2px] transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
            >
              {upper(category.name)}
            </Link>
          </div>

          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((news) => (
              <Link
                key={news.id}
                href={`/noticias/${news.slug}`}
                className="group flex gap-3"
              >
                {news.cover_image_url ? (
                  <Image
                    src={news.cover_image_url}
                    alt=""
                    width={112}
                    height={112}
                    style={coverFocusStyle(news)}
                    className="h-14 w-14 shrink-0 rounded-[var(--radius-thumb)] object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-[var(--radius-thumb)] bg-chip" />
                )}

                <div className="min-w-0">
                  {/* La sección no se repite aquí: la nombra el renglón. */}
                  <div className="mb-1 text-[9px] font-extrabold tracking-[1.2px] text-muted">
                    {timeAgoUpper(news.published_at)}
                  </div>
                  <div className="text-[13px] font-bold leading-snug transition-colors group-hover:text-accent">
                    {punct(news.title)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
