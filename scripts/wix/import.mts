/**
 * Importa el blog de Wix (Body Moving / HarryOpiniones) a Kort.
 *
 *   npx tsx scripts/wix/fetch-feed.mts   # descarga y cachea el origen
 *   npm run import:wix -- --dry          # muestra qué haría, sin escribir
 *   npm run import:wix                   # importa de verdad
 *
 * Es idempotente por slug: volver a correrlo actualiza las noticias que ya
 * existen en vez de duplicarlas.
 */
import { readdir, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readMinutes, slugify } from "../../lib/slug.ts";

import { parsePost, type ParsedBlock } from "./parse-post.mts";
import { blocksToContent, buildExcerpt } from "./to-content.mts";

const CACHE_DIR = path.join(process.cwd(), ".wix-cache");
const BUCKET = "news-images";
const DRY = process.argv.includes("--dry");

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  coverImage: string | null;
  creator: string;
  slug: string;
}

/**
 * El blog no tiene categorías propias, así que las derivamos del contenido.
 * Doce de las trece notas son de fútbol y una de ciclismo; si más adelante
 * quieres subdividir (Selección, Internacional…), se hace desde el panel sin
 * tocar esto.
 */
function categoryFor(title: string, body: string): string {
  const haystack = `${title} ${body}`.toLowerCase();
  if (/\bciclis|maillot|tour de francia|pelot[oó]n\b/.test(haystack)) return "Ciclismo";
  return "Fútbol";
}

async function ensureCategory(
  supabase: SupabaseClient,
  cache: Map<string, string>,
  name: string,
): Promise<string> {
  const cached = cache.get(name);
  if (cached) return cached;

  const slug = slugify(name);

  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    cache.set(name, existing.id);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({ name, slug })
    .select("id")
    .single();

  if (error) throw new Error(`No se pudo crear la sección ${name}: ${error.message}`);

  console.log(`   + sección creada: ${name}`);
  cache.set(name, data.id);
  return data.id;
}

/** Descarga una imagen de Wix y la sube a Supabase Storage. */
async function mirrorImage(
  supabase: SupabaseClient,
  url: string,
  seen: Map<string, string>,
): Promise<string | null> {
  const cached = seen.get(url);
  if (cached) return cached;

  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) {
    console.log(`   ! no se pudo bajar la imagen (${res.status}): ${url.slice(0, 80)}`);
    return null;
  }

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  const extension = contentType.split("/")[1].replace("jpeg", "jpg");
  const objectPath = `wix/${randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, buffer, { contentType, upsert: false });

  if (error) {
    console.log(`   ! no se pudo subir la imagen: ${error.message}`);
    return null;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);

  seen.set(url, publicUrl);
  return publicUrl;
}

/** El id de media de Wix, para detectar que dos URLs son la misma foto. */
function mediaId(url: string | null | undefined): string | null {
  return url?.split("/media/")[1]?.split("~")[0] ?? null;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Las notas se firman con el admin del sitio.
  const { data: admin } = await supabase
    .from("admins")
    .select("id, display_name")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (!admin) {
    console.error("No hay ningún admin. Corre primero: npm run seed:admin");
    process.exit(1);
  }

  const items = JSON.parse(
    await readFile(path.join(CACHE_DIR, "items.json"), "utf8"),
  ) as FeedItem[];
  const files = (await readdir(CACHE_DIR)).filter((f) => f.startsWith("post-")).sort();

  console.log(
    `${DRY ? "[SIMULACIÓN] " : ""}Importando ${files.length} notas, firmadas como ${admin.display_name}\n`,
  );

  const categoryCache = new Map<string, string>();
  const imageCache = new Map<string, string>();
  let created = 0;
  let updated = 0;

  for (const [i, file] of files.entries()) {
    const item = items[i];
    const parsed = parsePost(await readFile(path.join(CACHE_DIR, file), "utf8"));
    const title = parsed.title || item.title;

    if (!parsed.blocks.length) {
      console.log(`${String(i + 1).padStart(2)}. ⚠ ${title.slice(0, 55)} — sin cuerpo, se omite`);
      continue;
    }

    const coverId = mediaId(parsed.coverImage);

    // Wix repite la portada como primera imagen del cuerpo en casi todas las
    // notas; dejarla haría que el artículo mostrara la misma foto dos veces.
    const blocks: ParsedBlock[] = parsed.blocks.filter(
      (b) => !(b.type === "image" && coverId && mediaId(b.src) === coverId),
    );
    const droppedDup = parsed.blocks.length - blocks.length;

    const plainBody = blocks
      .filter((b) => b.type === "paragraph")
      .map((b) => b.text)
      .join(" ");
    const categoryName = categoryFor(title, plainBody);

    const slug = slugify(title);
    const excerpt = buildExcerpt(blocks);

    console.log(`${String(i + 1).padStart(2)}. ${title.slice(0, 58)}`);
    console.log(
      `    sección=${categoryName}  bloques=${blocks.length}` +
        `  imgs=${blocks.filter((b) => b.type === "image").length}` +
        (droppedDup ? `  (${droppedDup} img duplicada de portada omitida)` : "") +
        `  slug=${slug.slice(0, 46)}`,
    );

    if (DRY) {
      console.log(`    portada: ${parsed.coverImage ?? "(ninguna)"}`);
      console.log(`    extracto: ${excerpt?.slice(0, 90) ?? "(ninguno)"}\n`);
      continue;
    }

    const categoryId = await ensureCategory(supabase, categoryCache, categoryName);

    // Espeja las imágenes a Supabase para no depender del CDN de Wix.
    const coverUrl = parsed.coverImage
      ? await mirrorImage(supabase, parsed.coverImage, imageCache)
      : null;

    for (const block of blocks) {
      if (block.type === "image" && block.src) {
        block.src = (await mirrorImage(supabase, block.src, imageCache)) ?? block.src;
      }
    }

    const { html, json } = blocksToContent(blocks);

    const row = {
      title,
      slug,
      excerpt,
      content: json,
      content_html: html,
      cover_image_url: coverUrl,
      category_id: categoryId,
      status: "published" as const,
      author_id: admin.id,
      author_name: admin.display_name,
      read_minutes: readMinutes(html),
      published_at: new Date(item.pubDate).toISOString(),
    };

    const { data: existing } = await supabase
      .from("news")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("news").update(row).eq("id", existing.id);
      if (error) throw new Error(error.message);
      updated += 1;
      console.log("    ↻ actualizada\n");
    } else {
      const { error } = await supabase.from("news").insert(row);
      if (error) throw new Error(error.message);
      created += 1;
      console.log("    ✓ creada\n");
    }
  }

  console.log(DRY ? "Simulación terminada." : `Listo: ${created} creadas, ${updated} actualizadas.`);
}

main().catch((error) => {
  console.error(`\n${(error as Error).message}`);
  process.exit(1);
});
