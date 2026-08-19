import Image from "next/image";
import Link from "next/link";

import { formatPublishedAt } from "@/components/news/NewsCard";
import { coverFocusStyle } from "@/lib/image-focus";
import { punct } from "@/lib/punctuation";
import type { NewsWithCategory } from "@/lib/types";

/**
 * La tarjeta que interrumpe la lectura para ofrecer otra nota.
 *
 * Va horizontal y con la miniatura chica —no como las tarjetas de /archivo, que
 * son verticales y con foto grande— porque aquí compite con el texto: si
 * ocupara el ancho completo con una foto de 16:9 dejaría de leerse como un
 * apunte al margen y se leería como el final del artículo.
 *
 * Es un `<aside>` y lleva su propio rótulo visible para que quede claro que no
 * es parte de la nota. El `<hr>` de arriba no es decorativo: es lo que separa
 * el bloque del párrafo anterior sin necesidad de un recuadro pesado.
 */
export function InlineRecommendation({
  news,
  label,
}: {
  news: NewsWithCategory;
  label: string;
}) {
  const href = `/noticias/${news.slug}`;

  const meta = [
    news.category?.name,
    formatPublishedAt(news.published_at),
    news.read_minutes ? `${news.read_minutes} min` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <aside
      aria-label={label}
      className="kort-reveal my-10 border-y border-border-strong py-4"
    >
      <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>

      {/*
        Un solo enlace envuelve todo el bloque: dos enlaces anidados (tarjeta y
        sección) serían HTML inválido, y aquí la sección es solo dato de apoyo.
      */}
      <Link href={href} className="group flex items-start gap-4">
        {news.cover_image_url ? (
          <Image
            src={news.cover_image_url}
            alt=""
            width={240}
            height={240}
            style={coverFocusStyle(news)}
            className="h-20 w-20 shrink-0 rounded-[var(--radius-thumb)] object-cover transition-transform duration-500 ease-soft group-hover:scale-[1.05] sm:h-24 sm:w-24"
          />
        ) : (
          <span
            aria-hidden
            className="h-20 w-20 shrink-0 rounded-[var(--radius-thumb)] bg-chip sm:h-24 sm:w-24"
          />
        )}

        <span className="min-w-0 flex-1">
          <span className="block text-lg font-extrabold leading-snug underline decoration-transparent decoration-2 underline-offset-4 transition-colors duration-200 ease-soft group-hover:decoration-current">
            {punct(news.title)}
          </span>
          {meta && (
            <span className="mt-1.5 block text-xs font-semibold text-muted">{meta}</span>
          )}
        </span>
      </Link>
    </aside>
  );
}
