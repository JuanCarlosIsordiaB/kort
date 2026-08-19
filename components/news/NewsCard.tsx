import Image from "next/image";
import Link from "next/link";

import { coverFocusStyle } from "@/lib/image-focus";
import { punct } from "@/lib/punctuation";
import type { NewsWithCategory } from "@/lib/types";

const dateFormat = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function formatPublishedAt(value: string | null): string | null {
  return value ? dateFormat.format(new Date(value)) : null;
}

/**
 * Tarjeta de nota para /archivo y /categoria.
 *
 * La superficie y la sombra viven en el <article>, no en la imagen: antes solo
 * la foto reaccionaba al cursor y la tarjeta se sentía partida en dos. Misma
 * elevación que las tarjetas de la portada (components/home/CardGrid.tsx).
 */
export function NewsCard({ news }: { news: NewsWithCategory }) {
  return (
    <article className="kort-reveal group flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-card shadow-[var(--shadow-card)] transition-all duration-200 ease-soft hover:-translate-y-[3px] hover:shadow-[var(--shadow-card-hover)]">
      <Link href={`/noticias/${news.slug}`} className="block">
        {news.cover_image_url ? (
          <Image
            src={news.cover_image_url}
            alt=""
            width={640}
            height={360}
            style={coverFocusStyle(news)}
            className="h-40 w-full object-cover transition-transform duration-500 ease-soft group-hover:scale-[1.04]"
          />
        ) : (
          <div className="h-40 w-full bg-chip" />
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {news.category && (
          <Link
            href={`/categoria/${news.category.slug}`}
            className="text-xs font-bold uppercase tracking-wide text-foreground transition-opacity hover:opacity-70"
          >
            {news.category.name}
          </Link>
        )}

        <h3 className="text-base font-bold leading-snug">
          <Link href={`/noticias/${news.slug}`}>{punct(news.title)}</Link>
        </h3>

        {news.excerpt && <p className="text-sm text-muted">{punct(news.excerpt)}</p>}

        <p className="mt-auto pt-1 text-xs font-semibold text-muted">
          {[
            news.author_name,
            formatPublishedAt(news.published_at),
            news.read_minutes ? `${news.read_minutes} min` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </article>
  );
}
