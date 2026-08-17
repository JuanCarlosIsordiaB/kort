"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { RichTextEditor } from "@/components/editor/RichTextEditor";
import type { HomeSlot, SiteSettings } from "@/lib/data/home";
import type { NewsWithCategory } from "@/lib/types";

const SLOT_INFO: Record<HomeSlot, { label: string; help: string; max: number }> = {
  lead: {
    label: "Nota principal",
    help: "La del titular grande, con su extracto y foto grande.",
    max: 1,
  },
  breaking: {
    label: "Último minuto",
    help: "Primera pestaña del sidebar derecho.",
    max: 3,
  },
  featured: {
    label: "Destacadas",
    help: "Segunda pestaña del sidebar derecho.",
    max: 3,
  },
  opinion: {
    label: "Opinión",
    help: "La fila de abajo, con el avatar de iniciales del autor.",
    max: 2,
  },
};

const SLOTS = Object.keys(SLOT_INFO) as HomeSlot[];

export function PortadaEditor({
  initialSlots,
  initialSettings,
  news,
}: {
  initialSlots: Record<HomeSlot, string[]>;
  initialSettings: SiteSettings;
  news: NewsWithCategory[];
}) {
  const router = useRouter();

  const [slots, setSlots] = useState(initialSlots);
  const [settings, setSettings] = useState(initialSettings);
  const [headline, setHeadline] = useState<{ json: unknown; html: string }>({
    json: initialSettings.hero_headline_json,
    html: initialSettings.hero_headline_html ?? "",
  });

  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const byId = new Map(news.map((n) => [n.id, n]));

  function setPick(slot: HomeSlot, index: number, id: string) {
    setSlots((prev) => {
      const next = [...prev[slot]];
      if (id) next[index] = id;
      else next.splice(index, 1);
      // Compacta: sin huecos intermedios vacíos.
      return { ...prev, [slot]: next.filter(Boolean) };
    });
  }

  function move(slot: HomeSlot, index: number, delta: number) {
    setSlots((prev) => {
      const next = [...prev[slot]];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, [slot]: next };
    });
  }

  async function save() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/portada", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slots,
          settings: {
            ...settings,
            hero_headline_html: headline.html,
            hero_headline_json: headline.json,
          },
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({ kind: "error", text: body.error ?? "No se pudo guardar" });
        return;
      }
      setMessage({ kind: "ok", text: "Portada guardada." });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "No se pudo conectar con el servidor" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      {SLOTS.map((slot) => {
        const info = SLOT_INFO[slot];
        const picked = slots[slot];
        const rows = [...picked, ""].slice(0, info.max);

        return (
          <section key={slot}>
            <h2 className="text-sm font-extrabold uppercase tracking-wide">{info.label}</h2>
            <p className="mb-3 text-xs text-muted">{info.help}</p>

            <div className="flex flex-col gap-2">
              {rows.map((id, index) => (
                <div key={`${slot}-${index}`} className="flex items-center gap-2">
                  <span className="w-4 shrink-0 text-xs font-bold text-muted">{index + 1}</span>

                  {/* `min-w-0`: si no, el título más largo de la lista fija el
                      ancho mínimo del select y desborda la pantalla en móvil. */}
                  <select
                    value={id}
                    onChange={(e) => setPick(slot, index, e.target.value)}
                    className="w-full min-w-0 flex-1 rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
                  >
                    <option value="">
                      {index < picked.length ? "— quitar —" : "— automático (lo más reciente) —"}
                    </option>
                    {news.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.category?.name ? `[${n.category.name}] ` : ""}
                        {n.title}
                      </option>
                    ))}
                  </select>

                  {info.max > 1 && index < picked.length && (
                    <>
                      <button
                        type="button"
                        onClick={() => move(slot, index, -1)}
                        disabled={index === 0}
                        title="Subir"
                        aria-label="Subir"
                        className="h-9 w-9 shrink-0 rounded border border-border text-xs disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(slot, index, 1)}
                        disabled={index === picked.length - 1}
                        title="Bajar"
                        aria-label="Bajar"
                        className="h-9 w-9 shrink-0 rounded border border-border text-xs disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {slot === "lead" && picked[0] && (
              <p className="mt-2 text-xs text-muted">
                Titular del artículo: <em>{byId.get(picked[0])?.title}</em>
              </p>
            )}
          </section>
        );
      })}

      <section>
        <h2 className="text-sm font-extrabold uppercase tracking-wide">Titular de portada</h2>
        <p className="mb-3 text-xs text-muted">
          El texto grande de la nota principal. Si lo dejas vacío se usa el título del artículo
          tal cual. Lo que resaltes sale con el recuadro invertido del diseño.
        </p>
        <RichTextEditor
          variant="headline"
          initialContent={initialSettings.hero_headline_json ?? undefined}
          onChange={setHeadline}
          placeholder="Titular de portada…"
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-extrabold uppercase tracking-wide">Textos del sitio</h2>

        <Field
          label="Etiqueta del boletín"
          value={settings.newsletter_label}
          onChange={(v) => setSettings((s) => ({ ...s, newsletter_label: v }))}
        />
        <Field
          label="Titular del boletín"
          value={settings.newsletter_title}
          onChange={(v) => setSettings((s) => ({ ...s, newsletter_title: v }))}
        />
        <Field
          label="Línea del pie de página"
          value={settings.footer_tagline}
          onChange={(v) => setSettings((s) => ({ ...s, footer_tagline: v }))}
        />
      </section>

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
          {pending ? "Guardando…" : "Guardar portada"}
        </button>
        <a href="/" target="_blank" className="text-sm font-semibold text-muted underline">
          Ver la portada →
        </a>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-wide text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
      />
    </label>
  );
}
