import type { ReactNode } from "react";

/**
 * Puntuación en naranja.
 *
 * El efecto es tipográfico: los signos y las letras acentuadas del texto
 * editorial salen con `--orange` mientras el resto conserva la tinta. Como CSS
 * no puede seleccionar caracteres, hay que envolverlos en un <span> al
 * renderizar.
 *
 * El envoltorio se hace SIEMPRE, esté prendida la bandera o no: `.kort-punct`
 * hereda el color por su cuenta y solo cambia bajo `[data-punct-accent="true"]`
 * en el <html> (lo pone `app/layout.tsx` leyendo `site_settings`). Así ningún
 * componente necesita recibir la bandera por props ni volverse asíncrono, y
 * prender el interruptor no cambia el HTML — solo el CSS que lo pinta.
 *
 * Ojo: esto es para texto que se LEE. No usarlo en `<title>`, en metadatos, en
 * `alt`, ni en nada que termine en un atributo: ahí el <span> saldría escrito.
 */

/** La clase que pinta `app/globals.css`. */
export const PUNCT_CLASS = "kort-punct";

/**
 * Qué se pinta. Dos grupos:
 *
 *  - Signos: punto, coma, punto y coma, dos puntos, admiración e interrogación
 *    (con los de apertura del español) y puntos suspensivos.
 *  - Letras acentuadas: se pinta la letra ENTERA, no la tilde sola. Separar la
 *    tilde de la vocal (NFD) deja el signo a merced de cómo cada navegador y
 *    cada fuente recomponen el grupo, y en varios sale corrido o con el
 *    círculo punteado.
 *
 * Los guiones, las comillas y los paréntesis quedan fuera a propósito: son
 * mucho más frecuentes y el texto se volvía un salpicado.
 */
const PUNCT_RE = /[.,;:!?¡¿…]+|[áéíóúüñÁÉÍÓÚÜÑ]/g;

/**
 * Parte un texto y devuelve sus signos envueltos.
 *
 * Se llama en el punto de render (titulares, entradillas, cuerpo), no en la
 * capa de datos: el mismo `news.title` alimenta también `<title>` y Open Graph,
 * y ahí tiene que seguir siendo una cadena limpia.
 */
export function punct(value: string | null | undefined): ReactNode {
  if (!value) return value ?? null;

  const out: ReactNode[] = [];
  let last = 0;

  // `matchAll` en vez de `split` con grupo de captura: así el índice de cada
  // coincidencia sirve de key estable y no hay que adivinar qué trozo era signo.
  for (const match of value.matchAll(PUNCT_RE)) {
    const start = match.index;
    if (start > last) out.push(value.slice(last, start));
    out.push(
      <span key={start} className={PUNCT_CLASS}>
        {match[0]}
      </span>,
    );
    last = start + match[0].length;
  }

  if (!out.length) return value;
  if (last < value.length) out.push(value.slice(last));

  return out;
}

/**
 * Lo mismo, pero sobre el HTML que genera Tiptap (el cuerpo de la nota y el
 * titular de portada).
 *
 * Trabaja con una expresión regular y no con un parser porque solo necesita
 * distinguir dos cosas: lo que está dentro de `<...>` y lo que no. Se salta las
 * etiquetas enteras — si no, un `<a href="/x.png">` se llevaría un <span> en
 * medio del atributo — y también las entidades `&amp;`, por la misma razón.
 */
export function punctHtml(html: string | null | undefined): string {
  if (!html) return html ?? "";

  // Alternancia ordenada: primero se consume la etiqueta o la entidad completa
  // y se devuelve tal cual; solo lo que sobra puede ser un signo que pintar.
  return html.replace(
    /<[^>]*>|&[a-zA-Z#][a-zA-Z0-9]*;|[.,;:!?¡¿…]+|[áéíóúüñÁÉÍÓÚÜÑ]/g,
    (token) =>
      token.startsWith("<") || token.startsWith("&")
        ? token
        : `<span class="${PUNCT_CLASS}">${token}</span>`,
  );
}
