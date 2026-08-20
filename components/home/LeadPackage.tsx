import Image from "next/image";
import Link from "next/link";

import { LeadGallery } from "@/components/home/LeadGallery";
import { readUpper, shortDateUpper, upper } from "@/lib/format";
import { coverFocusStyle } from "@/lib/image-focus";
import { punct, punctHtml } from "@/lib/punctuation";
import type { NewsImage, NewsWithCategory } from "@/lib/types";

/**
 * El paquete principal de la portada: pill de sección, titular grande, extracto,
 * byline, botón y foto.
 *
 * El titular puede venir de `headlineHtml` (escrito con Tiptap desde el panel,
 * donde la marca `highlight` produce el recuadro invertido del diseño). Si no
 * hay titular curado, se usa el título de la nota tal cual.
 *
 * `images` es la galería visible de la nota. Con dos o más, la foto se vuelve
 * carrusel; con una sola —o con ninguna, cuando la nota es anterior a la
 * galería— se pinta la portada tal cual, sin montar nada de slider.
 */
export function LeadPackage({
  news,
  headlineHtml,
  images = [],
}: {
  news: NewsWithCategory;
  headlineHtml: string | null;
  images?: NewsImage[];
}) {
  return (
    <div className="border-border px-6 py-11 md:px-10 lg:border-r">
      {news.category && (
        <Link
          href={`/categoria/${news.category.slug}`}
          className="inline-block rounded-[var(--radius-tag)] border border-border-strong px-3 py-1.5 text-[10px] font-extrabold tracking-[1.6px] transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
        >
          {upper(news.category.name)}
        </Link>
      )}

      {headlineHtml ? (
        <h1
          className="kort-headline mt-5 mb-4"
          dangerouslySetInnerHTML={{ __html: punctHtml(headlineHtml) }}
        />
      ) : (
        <h1 className="kort-headline mt-5 mb-4">{punct(news.title)}</h1>
      )}

      {news.excerpt && (
        <p className="mb-4 max-w-[540px] text-base leading-relaxed text-muted">
          {punct(news.excerpt)}
        </p>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2.5 border-t border-border pt-3.5 text-[11px] font-extrabold tracking-[1.2px] text-muted">
        {[upper(news.author_name), shortDateUpper(news.published_at), readUpper(news.read_minutes)]
          .filter(Boolean)
          .map((part, i, all) => (
            <span key={part} className="flex items-center gap-2.5">
              {part}
              {i < all.length - 1 && <span aria-hidden>—</span>}
            </span>
          ))}
      </div>

      <Link
        href={`/noticias/${news.slug}`}
        className="mb-6 inline-block rounded-[var(--radius-pill)] border border-foreground bg-foreground px-6 py-3 text-[11px] font-extrabold tracking-[1.2px] text-background transition-colors hover:bg-background hover:text-foreground"
      >
        LEER LA NOTA →
      </Link>

      {images.length > 1 ? (
        <LeadGallery images={images} href={`/noticias/${news.slug}`} />
      ) : (
        news.cover_image_url && (
          <Link href={`/noticias/${news.slug}`} className="block">
            <Image
              src={news.cover_image_url}
              alt=""
              width={1280}
              height={640}
              priority
              style={coverFocusStyle(news)}
              className="h-[320px] w-full rounded-[var(--radius-hero)] object-cover shadow-[var(--shadow-card)]"
            />
          </Link>
        )
      )}
    </div>
  );
}
