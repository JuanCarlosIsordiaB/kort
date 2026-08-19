import Image from "next/image";
import Link from "next/link";

import { readShortUpper, timeAgoUpper, upper } from "@/lib/format";
import { coverFocusStyle } from "@/lib/image-focus";
import { punct } from "@/lib/punctuation";
import type { Category, NewsWithCategory } from "@/lib/types";

/** La barra "AHORA EN KORT" que separa el lead de la rejilla. */
export function NowBar() {
  return (
    <div className="flex h-13 items-center gap-4 border-y border-border-strong px-6 py-3.5 md:px-10">
      <span className="rounded-[var(--radius-pill)] bg-foreground px-3.5 py-1.5 text-[10px] font-extrabold tracking-[1.6px] text-background">
        AHORA EN KORT
      </span>
      <Link
        href="/archivo"
        className="text-[11px] font-extrabold tracking-[1.6px] text-muted transition-colors hover:text-foreground"
      >
        TENDENCIAS AHORA →
      </Link>
    </div>
  );
}

export function CategoryRail({ categories }: { categories: Category[] }) {
  if (!categories.length) return null;

  return (
    <div className="mb-7 flex flex-wrap gap-2.5">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/categoria/${category.slug}`}
          className="rounded-[var(--radius-pill)] border border-border-strong px-4 py-2.5 text-[11px] font-extrabold tracking-[1.2px] transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
        >
          {upper(category.name)}
        </Link>
      ))}
    </div>
  );
}

export function CardGrid({ items }: { items: NewsWithCategory[] }) {
  if (!items.length) return null;

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((news) => (
        <Link
          key={news.id}
          href={`/noticias/${news.slug}`}
          className="kort-reveal group flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-card shadow-[var(--shadow-card)] transition-all duration-200 ease-soft hover:-translate-y-[3px] hover:shadow-[var(--shadow-card-hover)]"
        >
          {news.cover_image_url ? (
            /* El acercamiento va sobre la foto y el recorte sobre la tarjeta
               (`overflow-hidden` de arriba): así la imagen crece dentro del
               marco en vez de empujarlo. */
            <Image
              src={news.cover_image_url}
              alt=""
              width={640}
              height={360}
              style={coverFocusStyle(news)}
              className="h-[150px] w-full object-cover transition-transform duration-500 ease-soft group-hover:scale-[1.04]"
            />
          ) : (
            <div className="h-[150px] w-full bg-chip" />
          )}

          <div className="p-3.5 pb-4">
            {/* El nombre de la sección va en el color del texto, no en el azul
                de interacción: no es clickeable por su cuenta. */}
            <div className="mb-2 text-[9px] font-extrabold tracking-[1.4px] text-foreground">
              {upper(news.category?.name) || "KORT"}
            </div>
            <div className="mb-2.5 text-[15px] font-bold leading-snug">{punct(news.title)}</div>
            <div className="text-[9px] font-extrabold tracking-[1.2px] text-muted">
              {[readShortUpper(news.read_minutes), timeAgoUpper(news.published_at)]
                .filter(Boolean)
                .join(" — ")}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
