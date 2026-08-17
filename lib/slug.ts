/** Título → slug: sin acentos, minúsculas, separado por guiones. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita los diacriticos que dejo el NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Igual que `slugify` pero garantiza que no choque con uno existente,
 * agregando `-2`, `-3`, etc.
 *
 * `isTaken` consulta la tabla correspondiente; `currentSlug` es el slug que ya
 * tiene la fila que se está editando, para que renombrar sin cambiar el título
 * no le agregue un sufijo a su propio slug.
 */
export async function uniqueSlug(
  input: string,
  isTaken: (slug: string) => Promise<boolean>,
  currentSlug?: string,
): Promise<string> {
  const base = slugify(input) || "sin-titulo";
  if (base === currentSlug) return base;

  let candidate = base;
  let n = 1;

  while (await isTaken(candidate)) {
    n += 1;
    candidate = `${base}-${n}`;
    if (n > 50) {
      // Escape sensato: en la práctica nunca se llega aquí.
      candidate = `${base}-${Date.now()}`;
      break;
    }
  }

  return candidate;
}

/**
 * Minutos de lectura a partir del HTML del cuerpo, a 200 palabras por minuto.
 * El diseño muestra este número en cada byline ("· 5 min").
 */
export function readMinutes(html: string | null | undefined): number {
  if (!html) return 1;
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .trim();
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 200));
}
