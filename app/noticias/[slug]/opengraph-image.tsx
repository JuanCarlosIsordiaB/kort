import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";
import sharp from "sharp";

import { getPublishedBySlug } from "@/lib/data/news";
import { upper } from "@/lib/format";

/**
 * Tarjeta que se ve cuando alguien comparte la nota en WhatsApp, X o Facebook.
 *
 * Se genera en vez de mandar la foto original por tres razones:
 *
 * 1. Este convenio de archivo hace que Next inyecte `og:image` con URL absoluta
 *    y `width`/`height` correctos, que es justo lo que suele faltar.
 * 2. Mete el título y el extracto dentro de la imagen, así que la vista previa
 *    se entiende aunque el cliente de mensajería recorte el texto.
 * 3. Controla el peso: WhatsApp descarta las imágenes pesadas y el enlace acaba
 *    compartiéndose sin miniatura.
 */
export const alt = "Vista previa de la nota";
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

const NAVY = "#0A1931";
const IVORY = "#FFF6E8";

const PHOTO_WIDTH = 504; // 42% de 1200

/** satori no lee woff2 (lo que usa next/font), por eso el TTF vive en el repo. */
function font(weight: 400 | 700 | 800) {
  return readFile(path.join(process.cwd(), "assets", "fonts", `Manrope-${weight}.ttf`));
}

/**
 * satori solo decodifica PNG y JPEG. Ocho de nuestras portadas son WebP o AVIF
 * (vienen así de Wix), y con esas la tarjeta salía sin foto. Se convierten con
 * sharp y de paso se reducen al tamaño en que se van a ver.
 */
async function coverAsJpegDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(PHOTO_WIDTH, size.height, { fit: "cover", position: "attention" })
      .jpeg({ quality: 78 })
      .toBuffer();

    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    // Una portada ilegible no debe tumbar la vista previa: sale sin foto.
    return null;
  }
}

/** Recorta en el último espacio para no partir una palabra a la mitad. */
function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > 0 ? space : max).replace(/[.,;:]$/, "")}…`;
}

export default async function OpengraphImage(props: PageProps<"/noticias/[slug]">) {
  const { slug } = await props.params;
  const news = await getPublishedBySlug(slug);

  const [regular, bold, extrabold, cover] = await Promise.all([
    font(400),
    font(700),
    font(800),
    news ? coverAsJpegDataUri(news.cover_image_url) : null,
  ]);

  const fonts = [
    { name: "Manrope", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Manrope", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Manrope", data: extrabold, weight: 800 as const, style: "normal" as const },
  ];

  const element = news ? (
    <Card news={news} cover={cover} />
  ) : (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: NAVY,
        color: IVORY,
        fontSize: 72,
        fontWeight: 800,
        fontFamily: "Manrope",
      }}
    >
      Kort
    </div>
  );

  const png = await new ImageResponse(element, { ...size, fonts }).arrayBuffer();

  // ImageResponse solo sabe emitir PNG, y un PNG con foto pesaba ~850 kb, por
  // encima de lo que WhatsApp acepta para generar miniatura. En JPEG baja a una
  // fracción sin diferencia visible a este tamaño.
  const jpeg = await sharp(Buffer.from(png)).jpeg({ quality: 86 }).toBuffer();

  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

function Card({
  news,
  cover,
}: {
  news: {
    title: string;
    excerpt: string | null;
    author_name: string | null;
    category: { name: string } | null;
    cover_focus_x: number;
    cover_focus_y: number;
  };
  cover: string | null;
}) {
  const title = clamp(news.title, 95);
  const titleSize = title.length > 80 ? 40 : title.length > 55 ? 48 : 56;

  // Con un título largo el extracto no cabe sin encimarse con el pie.
  const excerpt = title.length > 80 ? null : news.excerpt && clamp(news.excerpt, 120);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: NAVY,
        fontFamily: "Manrope",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: cover ? "58%" : "100%",
          padding: 56,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          {news.category && (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                background: IVORY,
                color: NAVY,
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: 2,
                padding: "8px 18px",
                borderRadius: 999,
                marginBottom: 26,
              }}
            >
              {upper(news.category.name)}
            </div>
          )}

          <div
            style={{
              display: "flex",
              color: IVORY,
              fontSize: titleSize,
              fontWeight: 800,
              lineHeight: 1.14,
              letterSpacing: -1,
            }}
          >
            {title}
          </div>

          {excerpt && (
            <div
              style={{
                display: "flex",
                marginTop: 22,
                color: "rgba(255,246,232,0.66)",
                fontSize: 23,
                lineHeight: 1.4,
              }}
            >
              {excerpt}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 28,
            color: "rgba(255,246,232,0.6)",
            fontSize: 19,
            fontWeight: 800,
            letterSpacing: 1.5,
          }}
        >
          <span style={{ color: IVORY, fontSize: 30 }}>KORT</span>
          {news.author_name && <span>— {upper(news.author_name)}</span>}
        </div>
      </div>

      {cover && (
        <div style={{ display: "flex", width: "42%", height: "100%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt=""
            width={PHOTO_WIDTH}
            height={size.height}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              // La columna de la foto es angosta (42% de 1200), así que aquí es
              // donde más se nota un encuadre mal elegido.
              objectPosition: `${news.cover_focus_x}% ${news.cover_focus_y}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}
