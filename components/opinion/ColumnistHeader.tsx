import { SocialLinks } from "@/components/site/SocialLinks";
import type { PublicReporter } from "@/lib/data/reporters";
import { upper } from "@/lib/format";
import { punct } from "@/lib/punctuation";

import { ColumnistAvatar } from "./ColumnistAvatar";

/**
 * La cabecera de `/opinion/[slug]`.
 *
 * Mismo banner con fondo que `/categoria` y `/reportero` —es la misma idea, de
 * quién es todo lo que viene abajo— pero con el nombre de la columna encima del
 * nombre, que es la jerarquía que usa la prensa: la columna es la marca, la
 * persona es quien la firma.
 */
export function ColumnistHeader({
  columnist,
  total,
}: {
  columnist: PublicReporter;
  total: number;
}) {
  return (
    /*
      En columna hasta `sm`, en fila de ahí para arriba. El `flex-wrap` no
      bastaba: la columna de texto lleva `min-w-0`, así que su ancho mínimo es
      cero y nunca desbordaba lo suficiente para saltar de renglón. En un
      teléfono de 375px quedaban 111px para el nombre y la semblanza al lado de
      un retrato de 128px —una tira de dos y tres palabras por línea que se leía
      como dos columnas rotas—. También se recorta el padding: 32px por lado en
      una pantalla que ya trae 24px de la página era casi un tercio del ancho.
    */
    <header className="mb-10 flex flex-col items-start gap-6 bg-chip px-6 py-8 sm:flex-row sm:px-8 sm:py-10">
      <ColumnistAvatar src={columnist.avatar_url} name={columnist.display_name} size={128} />

      {/* `w-full` porque `items-start` alinea al inicio también en columna, y
          sin él la caja se encogería a su contenido en vez de ocupar el ancho. */}
      <div className="w-full min-w-0 sm:flex-1">
        {columnist.column_name && (
          <div className="mb-2 text-[11px] font-extrabold tracking-[2px] text-accent">
            {upper(columnist.column_name)}
          </div>
        )}

        <h1 className="text-3xl font-extrabold sm:text-4xl">
          {punct(columnist.display_name)}
        </h1>

        {columnist.tagline && (
          <p className="mt-2 text-sm font-semibold text-muted">{punct(columnist.tagline)}</p>
        )}

        {columnist.bio && (
          <p className="mt-4 max-w-prose text-sm leading-relaxed">{punct(columnist.bio)}</p>
        )}

        <p className="mt-4 text-[10px] font-extrabold tracking-[1.3px] text-muted">
          {total === 0
            ? "TODAVÍA SIN COLABORACIONES"
            : `${total} ${total === 1 ? "COLABORACIÓN" : "COLABORACIONES"}`}
        </p>

        {/* `PublicReporter` ya trae las siete columnas: `SocialLinks` decide
            cuáles hay, en qué orden van y vuelve a comprobar cada URL antes de
            volverla un `href`. Ver lib/social.ts. */}
        <SocialLinks source={columnist} name={columnist.display_name} className="mt-4" />
      </div>
    </header>
  );
}
