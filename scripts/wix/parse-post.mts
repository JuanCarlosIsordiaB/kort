import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";

/**
 * Convierte el HTML de un post de Wix al HTML limpio que guarda Kort.
 *
 * Wix renderiza el cuerpo con su visor "Ricos": cada bloque es un
 * `div[data-breakout]` que envuelve un <p> (párrafo), un <br> suelto (línea
 * vacía) o un <figure data-hook="figure-IMAGE">. Las clases son ofuscadas y
 * cambian entre despliegues, así que nos anclamos a `data-breakout` y
 * `data-hook`, que sí son estables.
 */

export interface ParsedBlock {
  type: "paragraph" | "heading" | "image";
  /** HTML interno ya limpio (para paragraph/heading). */
  html?: string;
  text?: string;
  level?: 2 | 3;
  src?: string;
  alt?: string;
}

export interface ParsedPost {
  title: string;
  coverImage: string | null;
  blocks: ParsedBlock[];
  /** El "Por: Fulano" que Wix deja como primer párrafo del cuerpo. */
  bylineInBody: string | null;
}

/**
 * Wix sirve las imágenes con transformaciones en la URL
 * (`/v1/fill/w_147,h_78,.../file.png` es el placeholder diminuto que usa para
 * el lazy-load). Nos quedamos con el archivo original, sin transformar.
 */
export function originalWixImage(url: string): string {
  const m = url.match(/^(https:\/\/static\.wixstatic\.com\/media\/[^/]+)/);
  return m ? m[1] : url;
}

/** Marcas que conservamos; el resto se aplana a texto. */
const KEEP_TAGS = new Set(["strong", "b", "em", "i", "u", "a", "br"]);

function inlineHtml($: cheerio.CheerioAPI, node: AnyNode): string {
  if (node.type === "text") {
    return $.html(node);
  }

  if (node.type !== "tag") return "";

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const inner = el.children.map((c) => inlineHtml($, c)).join("");

  if (tag === "br") return "<br>";

  if (KEEP_TAGS.has(tag)) {
    if (tag === "a") {
      const href = $(el).attr("href");
      if (!href) return inner;
      return `<a href="${href}" rel="noopener noreferrer" target="_blank">${inner}</a>`;
    }
    // Normaliza b/i a las etiquetas que usa Tiptap.
    const normalized = tag === "b" ? "strong" : tag === "i" ? "em" : tag;
    return `<${normalized}>${inner}</${normalized}>`;
  }

  // span, div y demás envoltorios de Wix: se descartan y se conserva el contenido.
  return inner;
}

export function parsePost(html: string): ParsedPost {
  const $ = cheerio.load(html);

  const title = ($('meta[property="og:title"]').attr("content") ?? "").trim();
  const rawCover = $('meta[property="og:image"]').attr("content") ?? null;

  const blocks: ParsedBlock[] = [];
  let bylineInBody: string | null = null;

  $("div[data-breakout]").each((_, el) => {
    const $el = $(el);

    const figure = $el.find('figure[data-hook="figure-IMAGE"]');
    if (figure.length) {
      const img = figure.find("img");
      const src = img.attr("src") ?? img.attr("data-src") ?? "";
      if (src) {
        blocks.push({
          type: "image",
          src: originalWixImage(src),
          alt: (img.attr("alt") ?? "").trim(),
        });
      }
      return;
    }

    const $text = $el.children().first();
    const tag = $text.get(0)?.tagName?.toLowerCase() ?? "";
    const inner = $text
      .get(0)
      ?.children.map((c) => inlineHtml($, c))
      .join("")
      .trim();

    const plain = $el.text().replace(/\s+/g, " ").trim();
    if (!plain) return; // línea vacía de Wix

    if (/^h[23]$/.test(tag)) {
      blocks.push({
        type: "heading",
        level: tag === "h2" ? 2 : 3,
        html: inner,
        text: plain,
      });
      return;
    }

    // Wix deja la firma como primer párrafo; Kort ya la pinta por separado.
    if (blocks.length === 0 && /^Por:\s*/i.test(plain)) {
      bylineInBody = plain.replace(/^Por:\s*/i, "").trim();
      return;
    }

    blocks.push({ type: "paragraph", html: inner, text: plain });
  });

  return {
    title,
    coverImage: rawCover ? originalWixImage(rawCover) : null,
    blocks,
    bylineInBody,
  };
}
