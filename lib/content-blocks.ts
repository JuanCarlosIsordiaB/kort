/**
 * Corta el HTML del cuerpo de una nota para poder intercalar tarjetas dentro.
 *
 * El cuerpo es una cadena de HTML que genera Tiptap y que se inyecta con
 * `dangerouslySetInnerHTML`. Para meter algo *entre* dos párrafos hay que
 * partir esa cadena, y el único punto por donde se puede partir sin romper el
 * marcado es la frontera entre dos elementos de primer nivel.
 */

/** Elementos sin cierre. Un `<img>` suelto ya es un bloque completo. */
const VOID_TAGS = new Set(["img", "hr", "br", "input", "source", "col", "embed"]);

/**
 * Los elementos de primer nivel de `html`, en orden.
 *
 * La concatenación de lo que devuelve es idéntica a la entrada: se cortan
 * rebanadas contiguas, nunca se reescribe marcado. Eso es lo que permite
 * volver a inyectar cada trozo tal cual.
 *
 * No es un parser de HTML, es un contador de profundidad, y le alcanza porque
 * la salida de Tiptap es una lista plana de bloques bien formados. Lo único
 * que lo confundiría es un `>` crudo dentro del valor de un atributo, cosa que
 * el serializador de Tiptap no produce.
 */
export function topLevelBlocks(html: string): string[] {
  const blocks: string[] = [];
  const tag = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g;

  let depth = 0;
  let start = 0;
  let match: RegExpExecArray | null;

  while ((match = tag.exec(html)) !== null) {
    const [, closing, name, attrs] = match;
    const selfClosing = VOID_TAGS.has(name.toLowerCase()) || attrs.trimEnd().endsWith("/");

    if (closing) {
      depth = Math.max(0, depth - 1);
    } else if (!selfClosing) {
      depth += 1;
      continue;
    } else if (depth > 0) {
      // Un `<img>` dentro de una figura o un párrafo no cierra nada.
      continue;
    }

    if (depth === 0) {
      blocks.push(html.slice(start, tag.lastIndex));
      start = tag.lastIndex;
    }
  }

  const tail = html.slice(start);
  if (tail.trim()) blocks.push(tail);

  return blocks.filter((block) => block.trim());
}

/**
 * Cuántos bloques hace falta tener para que quepan N tarjetas.
 *
 * Una nota de cuatro párrafos con dos recomendaciones a media altura se lee
 * como un anuncio con texto alrededor, no como un artículo. Por eso el número
 * de tarjetas lo decide el largo del texto y no solo la configuración: lo que
 * llega del panel es un máximo, no una cuota.
 */
const MIN_BLOCKS: Record<number, number> = { 1: 6, 2: 10 };

/**
 * Dónde cae cada tarjeta, en fracción del cuerpo.
 *
 * Con dos, el pedido original: pasando el primer cuarto y ya entrado el
 * último. Con una sola, un poco antes de la mitad — que es donde el lector
 * decide si sigue.
 */
const FRACTIONS: Record<number, number[]> = { 1: [0.4], 2: [0.25, 0.75] };

/** Un corte justo después de un encabezado lo dejaría huérfano de su sección. */
function isHeading(block: string): boolean {
  return /^\s*<h[1-6][\s>]/i.test(block);
}

/**
 * Parte el cuerpo en `n + 1` segmentos, donde `n` es cuántas tarjetas caben de
 * verdad — puede ser menos que `max`, y para un texto corto puede ser cero.
 *
 * Un solo segmento significa "no cortes nada".
 */
export function splitForInserts(html: string, max: number): string[] {
  if (!html.trim() || max <= 0) return [html];

  const blocks = topLevelBlocks(html);

  let count = Math.min(max, 2);
  while (count > 0 && blocks.length < MIN_BLOCKS[count]) count -= 1;
  if (count === 0) return [html];

  const total = blocks.length;
  const cuts: number[] = [];

  for (const fraction of FRACTIONS[count]) {
    // Nunca en el primer ni en el último par de bloques: arriba competiría con
    // la entradilla y abajo se confundiría con el pie de la nota.
    let cut = Math.min(Math.max(Math.round(total * fraction), 2), total - 2);

    // Que el encabezado se vaya con el texto que titula.
    while (cut < total - 1 && isHeading(blocks[cut - 1])) cut += 1;

    // Y que dos tarjetas no queden a un párrafo de distancia.
    const previous = cuts[cuts.length - 1];
    if (previous !== undefined && cut - previous < 3) continue;

    cuts.push(cut);
  }

  if (cuts.length === 0) return [html];

  const segments: string[] = [];
  let from = 0;
  for (const cut of cuts) {
    segments.push(blocks.slice(from, cut).join(""));
    from = cut;
  }
  segments.push(blocks.slice(from).join(""));

  return segments;
}
