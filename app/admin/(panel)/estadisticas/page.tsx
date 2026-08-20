import type { Metadata } from "next";
import Link from "next/link";

import { requirePanelPermission } from "@/lib/auth/session";
import {
  getAudienceStats,
  getNewsroomStats,
  parseRange,
  RANGE_LABELS,
  STATS_RANGES,
  type StatsRange,
} from "@/lib/data/stats";
import { SITE_TIME_ZONE } from "@/lib/site";

import { ViewsChart } from "./ViewsChart";

export const metadata: Metadata = { title: "Estadísticas" };

const number = new Intl.NumberFormat("es-MX");

/**
 * Los promedios se muestran con un decimal.
 *
 * Redondeando a entero, un sitio que empieza —dos páginas vistas en siete
 * días— mostraría "0" y parecería que la medición no funciona. El decimal
 * desaparece solo en cuanto los números crecen.
 */
const averageFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });

function average(total: number, over: number): string {
  return averageFormat.format(over ? total / over : 0);
}

const dayFormat = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
  // El día llega como "YYYY-MM-DD", no como instante: ver el comentario en
  // ViewsChart.
  timeZone: "UTC",
});

const publishedFormat = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: SITE_TIME_ZONE,
});

export default async function EstadisticasPage(props: PageProps<"/admin/estadisticas">) {
  await requirePanelPermission("estadisticas");

  const range = parseRange((await props.searchParams).rango);

  const [audience, newsroom] = await Promise.all([
    getAudienceStats(range),
    getNewsroomStats(range),
  ]);

  const label = RANGE_LABELS[range].toLowerCase();
  const dailyAverage = average(audience.totals.views, range);
  const viewsPerNote = average(audience.allTime.views, newsroom.published);

  // Cuánto se lleva la sección más leída; es la referencia de las barras.
  const topCategoryViews = audience.categories[0]?.views ?? 0;

  return (
    <div className="max-w-5xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Estadísticas</h1>
          <p className="mt-1 text-sm text-muted">
            Cuánta gente entra al sitio y qué está leyendo. Las fechas son del
            calendario de la redacción (hora de la Ciudad de México).
          </p>
        </div>

        <RangePicker current={range} />
      </header>

      {/*
        Si esta página cargó, la medición está lista: sin las tablas de
        `0009_estadisticas.sql` la consulta habría lanzado y aquí habría una
        pantalla de error, no un aviso. Así que el aviso dice lo único que puede
        estar pasando —todavía nadie ha entrado desde que se mide— y no manda a
        revisar la base.
      */}
      {audience.allTime.views === 0 && (
        <p className="mb-6 rounded-[var(--radius-card)] border border-border bg-chip p-4 text-sm text-muted">
          Todavía no hay visitas registradas. El conteo corre solo en el sitio
          publicado —mientras se trabaja en local no se cuenta nada, para no
          ensuciar estos números— y empieza a llenarse en cuanto los lectores
          entren. Lo anterior a la medición no se puede recuperar.
        </p>
      )}

      {/* La fila de arriba: las cuatro cifras por las que alguien abre esta
          página. Todo lo demás explica estas. */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={`Visitas · ${label}`}
          value={audience.totals.sessions}
          delta={delta(audience.totals.sessions, audience.previous.sessions)}
          hint="Navegadores distintos que abrieron el sitio"
        />
        <StatTile
          label={`Páginas vistas · ${label}`}
          value={audience.totals.views}
          delta={delta(audience.totals.views, audience.previous.views)}
          hint="Cada página que se abrió, recargas incluidas"
        />
        <StatTile
          label="Hoy"
          value={audience.today.views}
          hint={`${number.format(audience.today.sessions)} visitas hasta ahora`}
        />
        <StatTile
          label="Promedio diario"
          value={dailyAverage}
          hint={`Páginas vistas por día en ${label}`}
        />
      </div>

      <ViewsChart series={audience.series} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-[var(--radius-card)] border border-border p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold">Notas más leídas</h2>
            <p className="text-xs text-muted">Últimos {label}</p>
          </div>

          {audience.topNews.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Todavía no hay notas publicadas que medir.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-border">
                  <tr className="text-xs text-muted">
                    <th className="py-2 pr-3 font-bold">Nota</th>
                    <th className="py-2 pr-3 font-bold">Sección</th>
                    <th className="py-2 pr-3 text-right font-bold">Lecturas</th>
                    <th className="py-2 text-right font-bold">Histórico</th>
                  </tr>
                </thead>
                <tbody>
                  {audience.topNews.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="max-w-[280px] py-2.5 pr-3">
                        {/* Al sitio público y en otra pestaña: desde aquí lo
                            que se quiere es ver la nota como la ve el lector,
                            no editarla. */}
                        <Link
                          href={`/noticias/${item.slug}`}
                          target="_blank"
                          className="font-semibold underline-offset-2 hover:underline"
                        >
                          {item.title}
                        </Link>
                        {item.publishedAt && (
                          <span className="block text-[11px] text-muted">
                            {publishedFormat.format(new Date(item.publishedAt))}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-muted">
                        {item.categoryName ?? "—"}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-bold tabular-nums">
                        {number.format(item.views)}
                      </td>
                      <td className="py-2.5 text-right text-muted tabular-nums">
                        {number.format(item.totalViews)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-[var(--radius-card)] border border-border p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-bold">Lecturas por sección</h2>

          {audience.categories.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Todavía no hay secciones con notas publicadas.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {audience.categories.map((category) => (
                <li key={category.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-semibold">{category.name}</span>
                    <span className="shrink-0 tabular-nums">
                      {number.format(category.views)}
                    </span>
                  </div>
                  {/* Barra proporcional a la sección más leída: la comparación
                      entre secciones es lo que se quiere ver, no el valor
                      absoluto —ese ya está escrito al lado. */}
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-[var(--radius-pill)] bg-chip">
                    <div
                      className="h-full rounded-[var(--radius-pill)] bg-orange"
                      style={{
                        width: topCategoryViews
                          ? `${(category.views / topCategoryViews) * 100}%`
                          : "0%",
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    {number.format(category.notes)}{" "}
                    {category.notes === 1 ? "nota publicada" : "notas publicadas"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-bold">Desde que se mide</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Páginas vistas"
            value={audience.allTime.views}
            hint={`${number.format(audience.allTime.sessions)} visitas en ${number.format(
              audience.allTime.days,
            )} días con registro`}
          />
          <StatTile
            label="Mejor día"
            value={audience.best?.views ?? 0}
            hint={
              audience.best
                ? dayFormat.format(new Date(`${audience.best.day}T00:00:00Z`))
                : "Sin datos todavía"
            }
          />
          <StatTile
            label="Lecturas por nota"
            value={viewsPerNote}
            hint="Promedio histórico de las publicadas"
          />
          <StatTile
            label="Clics en publicidad"
            value={newsroom.adClicks}
            hint={`${number.format(newsroom.activeAds)} ${
              newsroom.activeAds === 1 ? "campaña vigente" : "campañas vigentes"
            }`}
          />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-bold">Contenido</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Notas publicadas" value={newsroom.published} />
          <StatTile
            label={`Publicadas · ${label}`}
            value={newsroom.publishedInRange}
          />
          <StatTile label="Borradores" value={newsroom.drafts} />
          <StatTile label="Secciones" value={newsroom.categories} />
        </div>
      </section>
    </div>
  );
}

/**
 * El cambio contra el periodo anterior del mismo largo.
 *
 * Sin base con qué comparar (la semana pasada no había nada) no se inventa un
 * porcentaje: crecer desde cero no es "+100%", es simplemente el principio.
 */
function delta(current: number, previous: number): string | null {
  if (!previous) return null;
  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent === 0) return "Igual que el periodo anterior";
  return `${percent > 0 ? "↑" : "↓"} ${Math.abs(percent)}% vs. el periodo anterior`;
}

/**
 * Una cifra con su etiqueta. El número va en proporcionales y no en
 * `tabular-nums`: a este tamaño las cifras tabulares se ven sueltas, y aquí no
 * hay ninguna columna con la que alinear.
 */
function StatTile({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  /** Los conteos llegan como número y se formatean aquí; los promedios ya vienen hechos. */
  value: number | string;
  delta?: string | null;
  hint?: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 text-3xl font-extrabold">
        {typeof value === "number" ? number.format(value) : value}
      </p>
      {delta && <p className="mt-1 text-[11px] font-semibold text-muted">{delta}</p>}
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

/** Los tres rangos, como enlaces: el rango vive en la URL y se puede compartir. */
function RangePicker({ current }: { current: StatsRange }) {
  return (
    <nav aria-label="Periodo" className="flex gap-1 rounded-[var(--radius-pill)] bg-chip p-1">
      {STATS_RANGES.map((range) => {
        const active = range === current;
        return (
          <Link
            key={range}
            href={`/admin/estadisticas?rango=${range}`}
            aria-current={active ? "page" : undefined}
            className={`rounded-[var(--radius-pill)] px-3 py-1.5 text-xs font-bold transition-colors ${
              active ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {RANGE_LABELS[range]}
          </Link>
        );
      })}
    </nav>
  );
}
