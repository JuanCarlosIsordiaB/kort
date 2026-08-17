import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatPublishedAt } from "@/components/news/NewsCard";
import { NewsGallery } from "@/components/news/NewsGallery";
import { ReadingProgress } from "@/components/news/ReadingProgress";
import { ShareButtons } from "@/components/news/ShareButtons";
import { BackToTop } from "@/components/site/BackToTop";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getPublishedBySlug } from "@/lib/data/news";
import { initials } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";

export async function generateMetadata(
  props: PageProps<"/noticias/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const news = await getPublishedBySlug(slug);

  if (!news) return { title: "Noticia no encontrada" };

  const url = absoluteUrl(`/noticias/${news.slug}`);

  // `og:image` no se declara aquí a propósito: lo inyecta `opengraph-image.tsx`,
  // que además aporta las dimensiones correctas y una URL absoluta — las dos
  // cosas que hacen que WhatsApp y Facebook muestren la vista previa.
  return {
    title: news.title,
    description: news.excerpt ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      title: news.title,
      description: news.excerpt ?? undefined,
      url,
      type: "article",
      publishedTime: news.published_at ?? undefined,
      authors: news.author_name ? [news.author_name] : undefined,
      section: news.category?.name,
    },
    twitter: {
      card: "summary_large_image",
      title: news.title,
      description: news.excerpt ?? undefined,
    },
  };
}

export default async function NoticiaPage(props: PageProps<"/noticias/[slug]">) {
  const { slug } = await props.params;
  const news = await getPublishedBySlug(slug);

  if (!news) notFound();

  // El nombre del autor sale ahora junto al avatar, no dentro de esta línea.
  const meta = [
    formatPublishedAt(news.published_at),
    news.read_minutes ? `${news.read_minutes} min de lectura` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <SiteHeader />

      {/* Mide el <main>: la lectura empieza en el titular, no en el masthead. */}
      <ReadingProgress targetId="nota" />

      {/* `kort-stagger` escalona la entrada de los hijos directos: pill, titular,
          entradilla, firma, compartir, galería y cuerpo, en ese orden. */}
      <main
        id="nota"
        className="kort-stagger mx-auto w-full max-w-[720px] flex-1 px-6 py-12"
      >
        {news.category && (
          <Link
            href={`/categoria/${news.category.slug}`}
            className="inline-block rounded-[var(--radius-pill)] bg-foreground px-3 py-1 text-xs font-bold uppercase tracking-wide text-background"
          >
            {news.category.name}
          </Link>
        )}

        <h1 className="mt-4 text-4xl font-extrabold leading-tight">{news.title}</h1>

        {news.excerpt && <p className="mt-4 text-lg text-muted">{news.excerpt}</p>}

        <div className="mt-6 flex items-center gap-3 border-t border-border py-4">
          <AuthorAvatar name={news.author_name} url={news.author_avatar_url} />
          <div>
            {news.author_name && <p className="text-sm font-bold">{news.author_name}</p>}
            <p className="text-[13px] font-semibold text-muted">{meta}</p>
          </div>
        </div>

        <div className="border-b border-border">
          <ShareButtons url={absoluteUrl(`/noticias/${news.slug}`)} title={news.title} />
        </div>

        <NewsGallery images={news.images} />

        {/*
          `content_html` lo genera Tiptap a partir de lo que escribió un admin.
          La clase kort-prose es la que le devuelve el formato con el que se
          escribió (encabezados, listas, colores, resaltados).
        */}
        <div
          className="kort-prose mt-8"
          dangerouslySetInnerHTML={{ __html: news.content_html ?? "" }}
        />
      </main>

      <BackToTop />

      <SiteFooter />
    </>
  );
}

/** Foto del autor, con sus iniciales de respaldo si todavía no sube ninguna. */
function AuthorAvatar({ name, url }: { name: string | null; url: string | null }) {
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={88}
        height={88}
        className="h-11 w-11 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-strong text-[13px] font-extrabold text-muted"
    >
      {initials(name)}
    </span>
  );
}
