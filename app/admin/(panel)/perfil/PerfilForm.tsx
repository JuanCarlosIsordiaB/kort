"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { initials } from "@/lib/format";
import { SOCIAL_IDS, SOCIAL_NETWORKS } from "@/lib/social";
import { uploadImage } from "@/lib/upload-client";
import type { PublicAdmin } from "@/lib/types";

export function PerfilForm({ admin }: { admin: PublicAdmin }) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(admin.display_name);
  const [avatarUrl, setAvatarUrl] = useState(admin.avatar_url ?? "");

  /*
    Las redes, indexadas por el nombre de su columna.

    Un solo estado en vez de siete `useState`: las llaves salen del catálogo, y
    así agregar una red en `lib/social.ts` la hace aparecer en el formulario sin
    tocar este archivo. Lo que se teclea se guarda tal cual —"@fulano" o la URL
    pegada—; convertirlo en enlace es trabajo del servidor, que es donde la
    validación cuenta.
  */
  const [socials, setSocials] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      SOCIAL_IDS.map((id) => {
        const { column } = SOCIAL_NETWORKS[id];
        return [column, admin[column] ?? ""];
      }),
    ),
  );
  /*
    El texto de la columna. Solo lo ve quien está marcado como columnista: la
    bandera la pone un administrador desde /admin/usuarios y esta pantalla no la
    manda —el servidor tampoco la leería—, así que aquí solo se edita el texto.
  */
  const [columnName, setColumnName] = useState(admin.column_name ?? "");
  const [tagline, setTagline] = useState(admin.tagline ?? "");
  const [bio, setBio] = useState(admin.bio ?? "");

  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function pickAvatar(file: File) {
    setMessage(null);
    setUploading(true);
    try {
      setAvatarUrl(await uploadImage(file));
    } catch (e) {
      setMessage({ kind: "error", text: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      const res = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          avatar_url: avatarUrl || null,
          column_name: columnName,
          tagline,
          bio,
          ...socials,
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({ kind: "error", text: body.error ?? "No se pudo guardar" });
        return;
      }

      setMessage({
        kind: "ok",
        text: "Perfil guardado. La foto y tus redes ya aparecen en tu página.",
      });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "No se pudo conectar con el servidor" });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      {/* El selector de archivo es ancho: en móvil va debajo del avatar. */}
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        {avatarUrl ? (
          // Imagen ya subida a Supabase; <img> basta para la vista previa.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Tu foto de perfil"
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full border border-border-strong text-lg font-extrabold text-muted">
            {initials(displayName)}
          </span>
        )}

        <div className="flex min-w-0 flex-col gap-2">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void pickAvatar(file);
              e.target.value = "";
            }}
            className="text-sm"
          />
          <div className="flex items-center gap-3">
            {uploading && <span className="text-sm text-muted">Subiendo…</span>}
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl("")}
                className="text-xs font-semibold text-orange underline"
              >
                Quitar foto
              </button>
            )}
          </div>
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">
          Nombre visible
        </span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          className="rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
        />
        <span className="text-xs text-muted">
          Cambiarlo no reescribe la firma de las notas que ya publicaste: una byline
          firmada es un registro histórico. La foto sí se actualiza en todas.
        </span>
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-wide text-muted">Correo</span>
        <p className="text-sm text-muted">{admin.email}</p>
      </div>

      {admin.is_columnist ? (
        <fieldset className="flex flex-col gap-3 border-t border-border pt-6">
          <legend className="sr-only">Mi columna</legend>

          <div>
            <p className="text-sm font-bold">Mi columna</p>
            <p className="mt-1 text-xs text-muted">
              Encabeza cada una de tus colaboraciones en la sección de Opinión y
              abre tu página de columnista. Cambiar el nombre de la columna lo
              cambia en todo tu archivo, no solo en lo que publiques de hoy en
              adelante.
            </p>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">
              Nombre de la columna
            </span>
            <input
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              maxLength={80}
              placeholder="Ecos de la Sierra"
              className="rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">
              Frase corta
            </span>
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={120}
              placeholder="Analista política"
              className="rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
            />
            <span className="text-xs text-muted">
              Una línea, debajo de tu nombre. Quién eres en pocas palabras.
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">
              Semblanza
            </span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={1200}
              rows={5}
              className="rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
            />
            <span className="text-xs text-muted">
              Va en la cabecera de tu página. {bio.length}/1200
            </span>
          </label>
        </fieldset>
      ) : (
        <p className="border-t border-border pt-6 text-xs text-muted">
          ¿Escribes columna de opinión? Un administrador puede marcar tu cuenta
          como columnista desde Usuarios; entonces aparecerá aquí el nombre de tu
          columna y tu semblanza.
        </p>
      )}

      <fieldset className="flex flex-col gap-3 border-t border-border pt-6">
        <legend className="sr-only">Redes sociales</legend>

        <div>
          <p className="text-sm font-bold">Redes sociales</p>
          <p className="mt-1 text-xs text-muted">
            Salen como enlaces en tu página, debajo de tu nombre. Puedes escribir
            tu usuario (@fulano) o pegar la dirección completa del perfil; deja
            en blanco las que no uses.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_IDS.map((id) => {
            const { label, column, placeholder } = SOCIAL_NETWORKS[id];
            return (
              <label key={id} className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">
                  {label}
                </span>
                <input
                  value={socials[column] ?? ""}
                  onChange={(e) =>
                    setSocials((current) => ({ ...current, [column]: e.target.value }))
                  }
                  placeholder={placeholder}
                  // `type="text"` y no `type="url"`: el navegador rechazaría
                  // "@fulano", que es justamente una de las dos formas que se
                  // aceptan.
                  className="rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm"
                />
              </label>
            );
          })}
        </div>
      </fieldset>

      {message && (
        <p
          className={`text-sm font-semibold ${
            message.kind === "ok" ? "text-accent" : "text-orange"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-pill)] bg-accent px-5 py-3 text-sm font-bold text-accent-foreground disabled:opacity-60 max-sm:w-full sm:self-start sm:py-2"
      >
        {pending ? "Guardando…" : "Guardar perfil"}
      </button>
    </form>
  );
}
