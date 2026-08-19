import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdSlot } from "@/components/ads/AdSlot";
import { ArticleBody } from "@/components/news/ArticleBody";
import { formatPublishedAt } from "@/components/news/NewsCard";
import { NewsGallery } from "@/components/news/NewsGallery";
import { ReadingProgress } from "@/components/news/ReadingProgress";
import { ShareButtons } from "@/components/news/ShareButtons";
import { BackToTop } from "@/components/site/BackToTop";
import { JsonLd } from "@/components/site/JsonLd";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getSiteSettings } from "@/lib/data/home";
import { getInlineRecommendations, getPublishedBySlug } from "@/lib/data/news";
import { initials } from "@/lib/format";
import { punct } from "@/lib/punctuation";
import { breadcrumbJsonLd, organizationJsonLd } from "@/lib/seo";
import { absoluteUrl, SITE_URL } from "@/lib/site";

/**
 * La nota se cachea 5 minutos, igual que la portada.
 *
 * Antes se renderizaba entera en cada visita: una consulta a Supabase por
 * lector para devolver siempre lo mismo. Con la publicidad eso además obligaba
 * a resolver las campañas vigentes en cada petición.
 *
 * Hacen falta las dos exportaciones. `revalidate` por sí solo no activa nada en
 * una ruta con segmento dinámico: sin `generateStaticParams` la ruta se queda
 * como totalmente dinámica (ver la nota en los docs de generateStaticParams,
 * "You must return an empty array ... in order to revalidate (ISR) paths at
 * runtime"). El arreglo vacío significa "no prerenderices ninguna en el build,
 * pero cachea cada una la primera vez que alguien la pida" — que es lo correcto
 * para un sitio de noticias donde las notas nacen después del despliegue.
 */
export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata(
  props: PageProps<"/noticias/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const news = await getPublishedBySlug(slug);

  // Un slug que ya no existe devuelve 404, y una página de error indexada solo
  // ensucia el sitio en los resultados.
  if (!news) return { title: "Noticia no encontrada", robots: { index: false } };

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
      modifiedTime: news.updated_at,
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

  // Los ajustes no dependen de la nota, así que van en paralelo.
  const [news, settings] = await Promise.all([getPublishedBySlug(slug), getSiteSettings()]);

  if (!news) notFound();

  // Estas sí: hay que saber de qué sección es la nota para poder recomendar
  // dentro de ella, y cuál es para no recomendarse a sí misma.
  const recommendations = await getInlineRecommendations(
    { id: news.id, categoryId: news.category?.id ?? null },
    { count: settings.inline_recos_count, source: settings.inline_recos_source },
  );

  // El nombre del autor sale ahora junto al avatar, no dentro de esta línea.
  const readingTime = news.read_minutes ? `${news.read_minutes} min de lectura` : null;

  const url = absoluteUrl(`/noticias/${news.slug}`);

  /*
    Lo que hace que Google entienda esto como una nota y no como una página
    cualquiera: sin `NewsArticle` con fecha, autor y editor, la nota no entra al
    carrusel de Noticias ni muestra la firma en los resultados.

    Las imágenes van todas las que tenga (portada y galería) porque Google elige
    la que mejor le cuadra al formato en el que va a mostrar el resultado.
  */
  const images = [
    ...new Set(
      [news.cover_image_url, ...news.images.map((image) => image.url)].filter(
        (image): image is string => Boolean(image),
      ),
    ),
  ];

  const articleJsonLd = {
    "@type": "NewsArticle",
    "@id": `${url}#article`,
    mainEntityOfPage: url,
    url,
    headline: news.title,
    description: news.excerpt ?? undefined,
    image: images.length ? images : undefined,
    datePublished: news.published_at ?? news.created_at,
    dateModified: news.updated_at,
    author: news.author_name
      ? [{ "@type": "Person", name: news.author_name }]
      : [{ "@type": "Organization", name: "Kort", "@id": `${SITE_URL}/#organization` }],
    publisher: organizationJsonLd,
    articleSection: news.category?.name,
    inLanguage: "es-MX",
    isAccessibleForFree: true,
  };

  const breadcrumb = breadcrumbJsonLd([
    { name: "Inicio", path: "/" },
    ...(news.category
      ? [{ name: news.category.name, path: `/categoria/${news.category.slug}` }]
      : []),
    { name: news.title, path: `/noticias/${news.slug}` },
  ]);

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumb} />

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

        <h1 className="mt-4 text-4xl font-extrabold leading-tight">{punct(news.title)}</h1>

        {news.excerpt && <p className="mt-4 text-lg text-muted">{punct(news.excerpt)}</p>}

        <div className="mt-6 flex items-center gap-3 border-t border-border py-4">
          <AuthorAvatar name={news.author_name} url={news.author_avatar_url} />
          <div>
            {news.author_name && <p className="text-sm font-bold">{news.author_name}</p>}
            {/* `<time>` con la fecha en ISO: el texto de arriba está en
                español y con mes en letra, que un rastreador no puede parsear.
                El atributo sí. */}
            <p className="text-[13px] font-semibold text-muted">
              {news.published_at && (
                <time dateTime={news.published_at}>
                  {formatPublishedAt(news.published_at)}
                </time>
              )}
              {news.published_at && readingTime ? " · " : null}
              {readingTime}
            </p>
          </div>
        </div>

        <div className="border-b border-border">
          <ShareButtons url={url} title={news.title} />
        </div>

        <AdSlot zone="article-top" className="mt-8" />

        <NewsGallery images={news.images} />

        {/*
          `content_html` lo genera Tiptap a partir de lo que escribió un admin.
          `ArticleBody` lo parte por frontera de bloque para colar las notas
          recomendadas entre párrafo y párrafo, y le pone la clase kort-prose a
          cada trozo — que es la que le devuelve el formato con el que se
          escribió (encabezados, listas, colores, resaltados).
        */}
        <ArticleBody
          html={news.content_html}
          recommendations={recommendations}
          label={settings.inline_recos_label}
        />

        <AdSlot zone="article-bottom" className="mt-10" />
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
