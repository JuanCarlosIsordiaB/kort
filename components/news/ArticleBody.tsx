import { Fragment } from "react";

import { InlineRecommendation } from "@/components/news/InlineRecommendation";
import { splitForInserts } from "@/lib/content-blocks";
import { punctHtml } from "@/lib/punctuation";
import type { NewsWithCategory } from "@/lib/types";

/**
 * El cuerpo de la nota, con las tarjetas de recomendación intercaladas.
 *
 * El cuerpo se parte en segmentos por frontera de bloque y cada segmento se
 * inyecta en su propio `.kort-prose`. Cuántos cortes hay lo decide
 * `splitForInserts` mirando el largo del texto, no el número de tarjetas que
 * llegan: por eso se recorta `recommendations` contra los segmentos que
 * salieron y no al revés — en una nota corta simplemente no se usa ninguna.
 *
 * Todo va dentro de un `<div>` para seguir siendo UN hijo de `kort-stagger`:
 * devolver los segmentos sueltos los volvería hermanos del titular y de la
 * firma, y cada párrafo entraría con su propio retardo.
 */
export function ArticleBody({
  html,
  recommendations,
  label,
}: {
  html: string | null;
  recommendations: NewsWithCategory[];
  label: string;
}) {
  const segments = splitForInserts(html ?? "", recommendations.length);
  const cards = recommendations.slice(0, segments.length - 1);

  return (
    <div className="mt-8">
      {segments.map((segment, index) => (
        <Fragment key={index}>
          <div
            className="kort-prose"
            dangerouslySetInnerHTML={{ __html: punctHtml(segment) }}
          />
          {cards[index] && (
            <InlineRecommendation news={cards[index]} label={label} />
          )}
        </Fragment>
      ))}
    </div>
  );
}
