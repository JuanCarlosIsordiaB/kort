import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";

import type { ParsedBlock } from "./parse-post.mts";

/**
 * Convierte los bloques parseados de Wix al par que guarda Kort:
 * `content_html` (lo que se muestra en público) y `content` (JSON de Tiptap,
 * para poder re-editar la noticia en el panel).
 *
 * Los dos salen de la MISMA lista de bloques, así que no pueden divergir. Si se
 * generara el JSON aparte del HTML, abrir la noticia en el editor mostraría
 * algo distinto de lo publicado.
 */

interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
}

const TAG_TO_MARK: Record<string, TiptapMark> = {
  strong: { type: "bold" },
  em: { type: "italic" },
  u: { type: "underline" },
};

/** HTML en línea -> nodos de texto de Tiptap con sus marcas. */
function inlineToNodes(
  $: cheerio.CheerioAPI,
  nodes: AnyNode[],
  marks: TiptapMark[] = [],
): TiptapNode[] {
  const out: TiptapNode[] = [];

  for (const node of nodes) {
    if (node.type === "text") {
      const text = $(node).text();
      if (text) out.push({ type: "text", text, ...(marks.length ? { marks } : {}) });
      continue;
    }

    if (node.type !== "tag") continue;

    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (tag === "br") {
      out.push({ type: "hardBreak" });
      continue;
    }

    if (tag === "a") {
      const href = $(el).attr("href");
      out.push(
        ...inlineToNodes($, el.children, [
          ...marks,
          { type: "link", attrs: { href, target: "_blank", rel: "noopener noreferrer" } },
        ]),
      );
      continue;
    }

    const mark = TAG_TO_MARK[tag];
    out.push(...inlineToNodes($, el.children, mark ? [...marks, mark] : marks));
  }

  return out;
}

export function blocksToContent(blocks: ParsedBlock[]): {
  html: string;
  json: TiptapNode;
} {
  const htmlParts: string[] = [];
  const docContent: TiptapNode[] = [];

  for (const block of blocks) {
    if (block.type === "image") {
      const alt = block.alt ?? "";
      htmlParts.push(`<img src="${block.src}" alt="${alt}">`);
      docContent.push({
        type: "image",
        attrs: { src: block.src, alt: alt || null, title: null },
      });
      continue;
    }

    const inner = block.html ?? "";
    const $ = cheerio.load(`<div id="root">${inner}</div>`);
    const children = $("#root").get(0)?.children ?? [];
    const content = inlineToNodes($, children);

    if (!content.length) continue;

    if (block.type === "heading") {
      const level = block.level ?? 2;
      htmlParts.push(`<h${level}>${inner}</h${level}>`);
      docContent.push({ type: "heading", attrs: { level }, content });
      continue;
    }

    htmlParts.push(`<p>${inner}</p>`);
    docContent.push({ type: "paragraph", content });
  }

  return {
    html: htmlParts.join("\n"),
    json: { type: "doc", content: docContent },
  };
}

/** Extracto: el primer párrafo con algo de sustancia, recortado limpio. */
export function buildExcerpt(blocks: ParsedBlock[], max = 200): string | null {
  const first = blocks.find((b) => b.type === "paragraph" && (b.text?.length ?? 0) > 60);
  const text = first?.text;
  if (!text) return null;
  if (text.length <= max) return text;

  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).replace(/[.,;:]$/, "")}…`;
}
