"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SocialIcon } from "@/components/site/SocialIcon";
import type { SiteSettings } from "@/lib/data/home";
import { SITE_SOCIAL_IDS, SOCIAL_NETWORKS, socialList } from "@/lib/social";

export function RedesEditor({ initialSettings }: { initialSettings: SiteSettings }) {
  const router = useRouter();

  /*
    Indexadas por su columna, igual que en el perfil de cada firma. Se guarda
    tal cual se teclea —"@kortmx" o la URL pegada— y es el servidor quien lo
    convierte en enlace: la validación que cuenta es la que corre del lado que
    no se puede saltar.

    Los valores iniciales salen de `socialList` y no de leer las columnas a
    mano: así el formulario enseña exactamente lo que el sitio está pintando. Si
    alguien dejó basura en una columna editando el SQL a mano, `socialList` la
    descarta al renderizar y aquí el campo sale vacío, que es la verdad.
  */
  const [socials, setSocials] = useState<Record<string, string>>(() => {
    const saved = new Map(socialList(initialSettings).map((link) => [link.id, link.url]));
    return Object.fromEntries(
      SITE_SOCIAL_IDS.map((id) => [SOCIAL_NETWORKS[id].column, saved.get(id) ?? ""]),
    );
  });

  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const activos = SITE_SOCIAL_IDS.filter((id) => socials[SOCIAL_NETWORKS[id].column]?.trim());

  async function save() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/redes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(socials),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({ kind: "error", text: body.error ?? "No se pudo guardar" });
        return;
      }

      setMessage({
        kind: "ok",
        text: activos.length
          ? `Guardado. Saldrán ${activos.length} ${activos.length === 1 ? "red" : "redes"} en el sitio.`
          : "Guardado. Sin ninguna cuenta cargada, la fila de redes no aparece en el sitio.",
      });
      // Vuelve a traer la fila del servidor: si el validador normalizó lo que se
      // tecleó ("@kortmx" → la URL completa), el formulario debe enseñar eso.
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "No se pudo conectar con el servidor" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Contesta de un vistazo la pregunta que trae quien entra aquí: "¿por qué
          no veo las redes en la página?". Se guía por el campo lleno o vacío y
          no por `socialList`, porque mientras se teclea "@kortmx" todavía no es
          una URL y aun así esa red sí va a salir. */}
      <section className="rounded-[var(--radius-thumb)] border border-border bg-chip p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          Así se verá la fila
        </p>

        {activos.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Ninguna cuenta cargada: la fila de redes no se pinta, ni en el masthead
            ni en el pie ni en el menú de móvil.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {activos.map((id) => (
              <span
                key={id}
                title={SOCIAL_NETWORKS[id].label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] text-muted"
              >
                <SocialIcon id={id} size={18} />
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {SITE_SOCIAL_IDS.map((id) => {
          const { label, column, placeholder } = SOCIAL_NETWORKS[id];
          return (
            <label key={id} className="flex flex-col gap-1">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted">
                <SocialIcon id={id} size={14} />
                {label}
              </span>
              <input
                value={socials[column] ?? ""}
                onChange={(e) =>
                  setSocials((current) => ({ ...current, [column]: e.target.value }))
                }
                placeholder={placeholder}
                // `type="text"` y no `type="url"`: el navegador rechazaría
                // "@kortmx", que es una de las dos formas que acepta el validador.
                className="rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
              />
            </label>
          );
        })}
      </section>

      <p className="text-xs text-muted">
        Escribe el usuario (@kortmx) o pega la dirección completa del perfil; al
        guardar se convierte en enlace. Para quitar una red, borra el campo y
        guarda. Estas son las cuentas del periódico: las de cada firma se editan
        en el perfil de cada quien.
      </p>

      {message && (
        <p
          className={`text-sm font-semibold ${message.kind === "ok" ? "text-accent" : "text-orange"}`}
        >
          {message.text}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-[var(--radius-pill)] bg-accent px-5 py-3 text-sm font-bold text-accent-foreground disabled:opacity-60 max-sm:w-full sm:py-2"
        >
          {pending ? "Guardando…" : "Guardar redes"}
        </button>
        <a href="/" target="_blank" className="text-sm font-semibold text-muted underline">
          Ver el sitio →
        </a>
      </div>
    </div>
  );
}
