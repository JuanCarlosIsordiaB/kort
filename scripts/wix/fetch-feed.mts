/**
 * Descarga el feed del blog de Wix y cada post, y los deja en caché en disco.
 * Separado del importador para no re-descargar en cada intento.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const FEED = "https://dportesters.wixsite.com/misitio/blog-feed.xml";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
export const CACHE_DIR = path.join(process.cwd(), ".wix-cache");

export interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  coverImage: string | null;
  creator: string;
  slug: string;
}

function cdata(block: string, tag: string): string {
  const m = block.match(
    new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`),
  );
  return m ? m[1].trim() : "";
}

export function parseFeed(xml: string): FeedItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const block = m[1];
    const link = cdata(block, "link");
    return {
      title: cdata(block, "title"),
      link,
      pubDate: cdata(block, "pubDate"),
      coverImage: block.match(/<enclosure url="([^"]+)"/)?.[1] ?? null,
      creator: cdata(block, "dc:creator"),
      slug: decodeURIComponent(link.split("/post/")[1] ?? ""),
    };
  });
}

async function main() {
  await mkdir(CACHE_DIR, { recursive: true });

  const xml = await (await fetch(FEED, { headers: { "User-Agent": UA } })).text();
  await writeFile(path.join(CACHE_DIR, "feed.xml"), xml);

  const items = parseFeed(xml);
  console.log(`Feed: ${items.length} artículos\n`);

  for (const [i, item] of items.entries()) {
    const file = path.join(CACHE_DIR, `post-${String(i).padStart(2, "0")}.html`);
    const html = await (await fetch(item.link, { headers: { "User-Agent": UA } })).text();
    await writeFile(file, html);
    console.log(
      `${String(i + 1).padStart(2)}. ${item.title.slice(0, 62).padEnd(62)} ${Math.round(html.length / 1024)}kb`,
    );
  }

  await writeFile(
    path.join(CACHE_DIR, "items.json"),
    JSON.stringify(items, null, 2),
  );
  console.log(`\nCacheado en ${CACHE_DIR}`);
}

if (import.meta.filename === process.argv[1]) await main();
