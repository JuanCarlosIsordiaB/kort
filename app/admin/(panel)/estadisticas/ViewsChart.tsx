import type { DayPoint } from "@/lib/data/stats";
import { SITE_TIME_ZONE } from "@/lib/site";

/**
 * Las páginas vistas día por día del rango elegido.
 *
 * Sin librería de gráficas: son barras: divs con una altura en porcentaje. Meter
 * un paquete de charts al bundle para dibujar treinta rectángulos sería cambiar
 * cien kilobytes por nada, y así el componente se renderiza en el servidor —el
 * panel no manda ni un byte de JavaScript por esta gráfica.
 *
 * Una sola serie, un solo color: no hay identidades que distinguir, así que
 * tampoco hace falta leyenda — el título dice qué se está viendo.
 */

const dayLabel = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const longDayLabel = new Intl.DateTimeFormat("es-MX", {
  weekday: "short",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/**
 * `timeZone: "UTC"` a propósito, igual que en el panel de publicidad: el día
 * llega como "2026-08-19", que no es un instante. Al convertirlo a Date se lee
 * como medianoche UTC, y sin fijar la zona el formateador lo correría al día
 * anterior.
 */
function formatDay(day: string, long = false): string {
  const date = new Date(`${day}T00:00:00Z`);
  return (long ? longDayLabel : dayLabel).format(date).replace(".", "");
}

const number = new Intl.NumberFormat("es-MX");

export function ViewsChart({ series }: { series: DayPoint[] }) {
  const max = Math.max(...series.map((point) => point.views), 0);
  // Con todo en cero no hay escala que dibujar: las barras se quedan en el
  // suelo y la rejilla marca un tope simbólico de 1.
  const scale = max || 1;

  const totalViews = series.reduce((total, point) => total + point.views, 0);

  return (
    <section className="rounded-[var(--radius-card)] border border-border p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">Páginas vistas por día</h2>
        <p className="text-xs text-muted">
          {number.format(totalViews)} en {series.length} días · máximo{" "}
          {number.format(max)}
        </p>
      </div>

      <div className="relative">
        {/* Rejilla: tres hairlines de fondo. Van detrás de las barras y en el
            gris del borde, para que se lean como referencia y no como dato. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {[0, 50, 100].map((offset) => (
            <div
              key={offset}
              className="absolute inset-x-0 border-t border-border"
              style={{ top: `${offset}%` }}
            />
          ))}
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute -top-2 right-0 text-[10px] font-semibold text-muted"
        >
          {number.format(max)}
        </div>

        {/*
          El `role="img"` con su etiqueta es lo que oye un lector de pantalla:
          las barras sueltas no le dirían nada. El detalle exacto está en la
          tabla de abajo, que se puede abrir.
        */}
        <div
          role="img"
          aria-label={`Páginas vistas por día del ${formatDay(series[0]?.day ?? "", true)} al ${formatDay(
            series[series.length - 1]?.day ?? "",
            true,
          )}. Máximo ${number.format(max)} en un día.`}
          className="flex h-48 items-end gap-[2px]"
        >
          {series.map((point) => {
            const height = (point.views / scale) * 100;
            return (
              <div
                key={point.day}
                className="group relative flex h-full flex-1 items-end justify-center"
              >
                <div
                  className="w-full max-w-[24px] rounded-t-[4px] bg-orange transition-opacity group-hover:opacity-70"
                  style={{
                    // El mínimo de 3px es para que un día con dos visitas no se
                    // vea idéntico a uno con cero.
                    height: point.views ? `max(3px, ${height}%)` : "0px",
                  }}
                />

                {/* Etiqueta al pasar el ratón. En táctil no hay hover, y para
                    eso está la tabla de abajo. */}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-[var(--radius-thumb)] border border-border bg-background px-2 py-1 text-[11px] font-semibold shadow-[var(--shadow-card)] group-hover:block">
                  <span className="block text-muted">{formatDay(point.day, true)}</span>
                  {number.format(point.views)} vistas · {number.format(point.sessions)}{" "}
                  visitas
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Solo tres marcas en el eje: con treinta o noventa días, una etiqueta
          por barra es ilegible. */}
      <div className="mt-2 flex justify-between text-[10px] font-semibold text-muted">
        <span>{formatDay(series[0]?.day ?? "")}</span>
        <span>{formatDay(series[Math.floor(series.length / 2)]?.day ?? "")}</span>
        <span>{formatDay(series[series.length - 1]?.day ?? "")}</span>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-muted hover:text-foreground">
          Ver los números día por día
        </summary>
        <div className="mt-3 max-h-72 overflow-y-auto rounded-[var(--radius-thumb)] border border-border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 border-b border-border bg-chip">
              <tr>
                <th className="px-3 py-2 font-bold">Día</th>
                <th className="px-3 py-2 text-right font-bold">Visitas</th>
                <th className="px-3 py-2 text-right font-bold">Páginas vistas</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[...series].reverse().map((point) => (
                <tr key={point.day} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{formatDay(point.day, true)}</td>
                  <td className="px-3 py-2 text-right">{number.format(point.sessions)}</td>
                  <td className="px-3 py-2 text-right">{number.format(point.views)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="sr-only">Las fechas están en la zona {SITE_TIME_ZONE}.</p>
    </section>
  );
}
