"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { initials } from "@/lib/format";
import { uploadImage } from "@/lib/upload-client";
import type { PublicAdmin } from "@/lib/types";

export function PerfilForm({ admin }: { admin: PublicAdmin }) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(admin.display_name);
  const [avatarUrl, setAvatarUrl] = useState(admin.avatar_url ?? "");
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
        body: JSON.stringify({ display_name: displayName, avatar_url: avatarUrl || null }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({ kind: "error", text: body.error ?? "No se pudo guardar" });
        return;
      }

      setMessage({
        kind: "ok",
        text: "Perfil guardado. La foto ya aparece en todas tus notas.",
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
