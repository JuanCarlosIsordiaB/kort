/**
 * Datos estructurados (JSON-LD) para una página.
 *
 * Es un `<script>` nativo y no `next/script` a propósito: esto es un dato, no
 * código, y `next/script` lo trataría como algo que hay que programar cuándo
 * ejecutar.
 *
 * El `replace` no es decorativo. El contenido sale de la base —títulos y
 * extractos que escribe la redacción—, y un `</script>` dentro de una cadena
 * cerraría la etiqueta y convertiría el resto en HTML ejecutable. Escapando el
 * `<` como unicode el JSON sigue siendo válido y ya no puede cerrar nada.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", ...data }).replace(
          /</g,
          "\u003c",
        ),
      }}
    />
  );
}
