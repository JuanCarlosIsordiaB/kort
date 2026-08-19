"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AD_ZONES, AD_ZONE_KEYS, adZoneOptionLabel, isAdZone, type AdZone } from "@/lib/ad-zones";
import { uploadImage } from "@/lib/upload-client";
import type { Ad } from "@/lib/types";

/**
 * Alta y edición de una campaña con el mismo formulario: la ausencia del prop
 * `ad` significa alta. Igual que `NewsForm`.
 *
 * `today` llega del servidor y no de `new Date()` para que el valor inicial de
 * las fechas sea el mismo en el HTML del servidor y tras hidratar.
 */

/** Aritmética de calendario sobre "YYYY-MM-DD". UTC es exacto: no hay hora. */
function addDays(day: string, delta: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + delta)).toISOString().slice(0, 10);
}

const DEFAULT_RUN_DAYS = 30;

export function AdForm({ ad, today }: { ad?: Ad; today: string }) {
  const router = useRouter();

  const [advertiser, setAdvertiser] = useState(ad?.advertiser ?? "");
  const [zone, setZone] = useState<AdZone>(ad && isAdZone(ad.zone) ? ad.zone : AD_ZONE_KEYS[0]);
  const [imageUrl, setImageUrl] = useState(ad?.image_url ?? "");
  const [targetUrl, setTargetUrl] = useState(ad?.target_url ?? "");
  const [alt, setAlt] = useState(ad?.alt ?? "");
  const [startsOn, setStartsOn] = useState(ad?.starts_on ?? today);
  const [endsOn, setEndsOn] = useState(ad?.ends_on ?? addDays(today, DEFAULT_RUN_DAYS));
  const [active, setActive] = useState(ad?.active ?? true);
  const [notes, setNotes] = useState(ad?.notes ?? "");

  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spec = AD_ZONES[zone];

  async function pickImage(file: File) {
    setError(null);
    setUploading(true);
    try {
      setImageUrl(await uploadImage(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!imageUrl) {
      setError("Sube la imagen del anuncio antes de guardar");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(ad ? `/api/anuncios/${ad.id}` : "/api/anuncios", {
        method: ad ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advertiser,
          zone,
          image_url: imageUrl,
          target_url: targetUrl,
          alt: alt || null,
          starts_on: startsOn,
          ends_on: endsOn,
          active,
          notes: notes || null,
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? "No se pudo guardar");
        return;
      }

      router.push("/admin/publicidad");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="flex max-w-2xl flex-col gap-6">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          Empresa que contrató
        </span>
        <input
          value={advertiser}
          onChange={(e) => setAdvertiser(e.target.value)}
          required
          maxLength={200}
          placeholder="Ferretería Los Pinos"
          className="rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          Dónde se muestra
        </span>
        <select
          value={zone}
          onChange={(e) => setZone(e.target.value as AdZone)}
          className="rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
        >
          {AD_ZONE_KEYS.map((key) => (
            <option key={key} value={key}>
              {adZoneOptionLabel(key)}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted">
          {spec.hint} Pide el creativo de {spec.width}×{spec.height} píxeles: se muestra a esa
          proporción y en pantallas chicas se reduce sin recortarse.
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">Imagen</span>

        {imageUrl && (
          // Ya está en Supabase Storage; <img> basta para la vista previa.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Vista previa del anuncio"
            style={{ maxWidth: spec.width }}
            className="h-auto w-full rounded-[var(--radius-card)] border border-border"
          />
        )}

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void pickImage(file);
              e.target.value = "";
            }}
            className="text-sm"
          />
          {uploading && <span className="text-sm text-muted">Subiendo…</span>}
          {imageUrl && (
            <button
              type="button"
              onClick={() => setImageUrl("")}
              className="text-xs font-semibold text-orange underline"
            >
              Quitar imagen
            </button>
          )}
        </div>
        <span className="text-xs text-muted">
          JPG, PNG, WebP, AVIF o GIF animado. Máximo 5 MB.
        </span>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          A dónde lleva el clic
        </span>
        <input
          type="url"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          required
          placeholder="https://www.ejemplo.com"
          className="rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
        />
        <span className="text-xs text-muted">
          Se abre en una pestaña nueva. Los clics se cuentan y se ven en la lista.
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          Texto alternativo (opcional)
        </span>
        <input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          maxLength={300}
          placeholder="Promoción de verano en Ferretería Los Pinos"
          className="rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
        />
        <span className="text-xs text-muted">
          Lo que oye quien navega con lector de pantalla. Si se deja vacío se usa el nombre de
          la empresa.
        </span>
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Desde</span>
          <input
            type="date"
            value={startsOn}
            onChange={(e) => setStartsOn(e.target.value)}
            required
            className="rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Hasta</span>
          <input
            type="date"
            value={endsOn}
            // `min` solo ayuda a no equivocarse al capturar; la regla de verdad
            // la aplica la API, que es a donde puede llegar cualquiera.
            min={startsOn}
            onChange={(e) => setEndsOn(e.target.value)}
            required
            className="rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
          />
        </label>
      </div>
      <span className="-mt-4 text-xs text-muted">
        Los dos días cuentan. Al terminar, la campaña deja de mostrarse sola y se queda aquí
        marcada como vencida por si hay que renovarla.
      </span>

      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="mt-1"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">Campaña activa</span>
          <span className="text-xs text-muted">
            Desmárcala para pausarla sin borrarla ni tocarle las fechas.
          </span>
        </span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          Notas internas (opcional)
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Contacto, número de contrato, lo que haga falta recordar."
          className="rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
        />
        <span className="text-xs text-muted">Solo se ven aquí; nunca salen al sitio.</span>
      </label>

      {error && <p className="text-sm font-semibold text-orange">{error}</p>}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending || uploading}
          className="rounded-[var(--radius-pill)] bg-accent px-5 py-3 text-sm font-bold text-accent-foreground disabled:opacity-60 max-sm:w-full sm:py-2"
        >
          {pending ? "Guardando…" : ad ? "Guardar cambios" : "Crear campaña"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/publicidad")}
          className="text-sm font-semibold text-muted underline"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
