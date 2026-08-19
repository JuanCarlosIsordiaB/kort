"use client";

/**
 * Script en línea que corre mientras el navegador parsea el HTML, antes del
 * primer pintado. Es la única forma de aplicar algo que solo se sabe en el
 * cliente (el tema guardado) sin que se vea el destello del valor equivocado.
 *
 * El `type` cambia según dónde se renderiza, y eso es lo que evita el aviso
 * "Encountered a script tag while rendering React component" en consola:
 *
 * - En el servidor sale como `text/javascript`, así que el navegador lo
 *   ejecuta al parsear. Ese es el único momento en que queremos que corra.
 * - En el cliente sale como `text/plain`. React nunca ejecuta los <script> que
 *   crea él mismo —los reemplaza por un <div>—, y avisa por consola cuando ve
 *   uno ejecutable. Con un tipo inerte deja de avisar, y no perdemos nada
 *   porque de todos modos no lo iba a ejecutar.
 *
 * Es Client Component a propósito: si fuera de servidor, el `typeof window`
 * se resolvería una sola vez al generar la carga del RSC y el cliente vería
 * `text/javascript` igual.
 *
 * `suppressHydrationWarning` es por ese cambio de `type` entre servidor y
 * cliente, que es intencional y no un desajuste real.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
