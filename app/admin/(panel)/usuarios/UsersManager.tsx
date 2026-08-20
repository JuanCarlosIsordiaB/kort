"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ADMIN_ROLES, ROLE_LABELS, type AdminRole } from "@/lib/auth/roles";
import type { AdminAccount } from "@/lib/data/admins";
import { initials } from "@/lib/format";
import { MIN_PASSWORD_LENGTH } from "@/lib/users-input";

/**
 * Alta, edición y baja de cuentas del panel.
 *
 * El formulario de alta arranca plegado: casi siempre se entra aquí a revisar
 * quién tiene acceso, no a dar de alta a alguien, y desplegado empujaba la
 * lista —lo que sí se viene a ver— abajo del pliegue.
 *
 * La contraseña se escribe una vez y no se puede volver a leer: la base solo
 * guarda el hash. Por eso el alta la deja a la vista mientras se captura, y la
 * edición trae el campo vacío con el sentido de "déjala como está".
 */

const ROLE_HINTS: Record<AdminRole, string> = {
  admin: "Todo el panel: noticias, portada, secciones, publicidad y usuarios.",
  reportero: "Solo noticias, y únicamente las que publique con su cuenta.",
};

const INPUT =
  "w-full rounded-[var(--radius-thumb)] border border-border bg-input px-3 py-2 text-sm";

interface Draft {
  display_name: string;
  role: AdminRole;
  password: string;
  /*
    El perfil de columnista viaja completo en el borrador aunque el formulario
    solo enseñe la casilla y los tres textos. Es necesario: el servidor
    sobrescribe estas columnas con lo que reciba, así que un campo que no se
    mandara se guardaría en blanco y le borraría la semblanza a quien la tuviera
    escrita. Las redes no están aquí justamente por eso — se editan solo en
    /admin/perfil, ver `ColumnistFields` en lib/data/admins.ts.
  */
  is_columnist: boolean;
  column_name: string;
  tagline: string;
  bio: string;
}

const EMPTY_DRAFT: Draft = {
  display_name: "",
  role: "reportero",
  password: "",
  is_columnist: false,
  column_name: "",
  tagline: "",
  bio: "",
};

export function UsersManager({
  users,
  currentAdminId,
}: {
  users: AdminAccount[];
  currentAdminId: string;
}) {
  const router = useRouter();

  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Draft>(EMPTY_DRAFT);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function send(url: string, method: string, body?: unknown): Promise<boolean> {
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error ?? "Algo salió mal");
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setPending(false);
    }
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const created = email;
    if (!(await send("/api/usuarios", "POST", { email, ...draft }))) return;

    setNotice(
      `Cuenta creada para ${created}. Pásale la contraseña por un canal seguro: desde aquí ya no se puede volver a ver.`,
    );
    setEmail("");
    setDraft(EMPTY_DRAFT);
    setCreating(false);
  }

  async function saveEdit(user: AdminAccount) {
    if (!(await send(`/api/usuarios/${user.id}`, "PUT", edit))) return;

    setNotice(
      edit.password
        ? `Cuenta de ${user.display_name} actualizada, con contraseña nueva.`
        : `Cuenta de ${user.display_name} actualizada.`,
    );
    setEditingId(null);
  }

  async function remove(user: AdminAccount) {
    // Se dice de frente qué pasa con lo que firmó: la nota no se va con la
    // cuenta, y quien borra tiene que saberlo antes de confirmar.
    const firmadas =
      user.news_count === 0
        ? ""
        : user.news_count === 1
          ? " Su noticia sigue publicada y firmada con su nombre."
          : ` Sus ${user.news_count} noticias siguen publicadas y firmadas con su nombre.`;

    if (!window.confirm(`¿Eliminar la cuenta de ${user.display_name}?${firmadas}`)) return;

    if (await send(`/api/usuarios/${user.id}`, "DELETE")) {
      setNotice(`Cuenta de ${user.display_name} eliminada.`);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {creating ? (
        <form
          onSubmit={create}
          className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border p-4 sm:p-5"
        >
          <h2 className="text-lg font-extrabold">Nueva cuenta</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <input
                value={draft.display_name}
                onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
                placeholder="Nombre y apellido"
                required
                className={INPUT}
              />
            </Field>

            <Field label="Correo">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reportero@kort.mx"
                required
                className={INPUT}
              />
            </Field>

            <Field label="Contraseña" hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}>
              {/*
                Sin `type="password"`: la escribe un administrador para
                dictársela a alguien más, y taparla solo invita a una errata que
                después nadie puede verificar.
              */}
              <input
                value={draft.password}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                minLength={MIN_PASSWORD_LENGTH}
                required
                className={INPUT}
              />
            </Field>

            <Field label="Rol" hint={ROLE_HINTS[draft.role]}>
              <RoleSelect value={draft.role} onChange={(role) => setDraft({ ...draft, role })} />
            </Field>
          </div>

          <ColumnistFieldset
            draft={draft}
            onChange={(patch) => setDraft({ ...draft, ...patch })}
          />

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={pending}
              className="rounded-[var(--radius-pill)] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-50"
            >
              {pending ? "Creando…" : "Crear cuenta"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setError(null);
              }}
              className="text-sm font-semibold text-muted underline"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setError(null);
            setNotice(null);
          }}
          className="self-start rounded-[var(--radius-pill)] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground"
        >
          Nueva cuenta
        </button>
      )}

      {error && <p className="text-sm font-semibold text-orange">{error}</p>}
      {notice && <p className="text-sm font-semibold text-muted">{notice}</p>}

      <ul className="rounded-[var(--radius-card)] border border-border">
        {users.map((user) => {
          const isMe = user.id === currentAdminId;

          return (
            // El padding vive en cada modo y no en el <li>: la fila en reposo
            // es un enlace que se estira sobre toda la tarjeta, y el resaltado
            // al pasar el cursor tiene que cubrir justo esa superficie.
            <li key={user.id} className="border-b border-border last:border-0">
              {editingId === user.id ? (
                <div className="flex flex-col gap-4 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nombre">
                      <input
                        value={edit.display_name}
                        onChange={(e) => setEdit({ ...edit, display_name: e.target.value })}
                        className={INPUT}
                      />
                    </Field>

                    <Field
                      label="Rol"
                      hint={
                        isMe
                          ? "No puedes cambiar tu propio rol: de un clic te quedarías fuera."
                          : ROLE_HINTS[edit.role]
                      }
                    >
                      <RoleSelect
                        value={edit.role}
                        disabled={isMe}
                        onChange={(role) => setEdit({ ...edit, role })}
                      />
                    </Field>

                    <Field
                      label="Contraseña nueva"
                      hint="Déjala vacía para no cambiarla."
                      className="sm:col-span-2"
                    >
                      <input
                        value={edit.password}
                        onChange={(e) => setEdit({ ...edit, password: e.target.value })}
                        placeholder="—"
                        className={INPUT}
                      />
                    </Field>
                  </div>

                  <ColumnistFieldset
                    draft={edit}
                    onChange={(patch) => setEdit({ ...edit, ...patch })}
                  />

                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => saveEdit(user)}
                      disabled={pending}
                      className="rounded-[var(--radius-pill)] bg-accent px-4 py-2 text-sm font-bold text-accent-foreground disabled:opacity-50"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-sm font-semibold text-muted underline"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group relative flex flex-wrap items-center gap-x-3 gap-y-3 p-4 transition-colors hover:bg-chip">
                  {/*
                    El enlace se estira sobre la tarjeta en vez de envolverla:
                    dentro de un <a> no pueden vivir los botones de editar y
                    eliminar. Va transparente y antes que ellos en el DOM, así
                    que los botones —posicionados también— quedan encima y
                    siguen recibiendo su propio clic.
                  */}
                  <Link
                    href={`/admin/usuarios/${user.id}`}
                    aria-label={`Ver la ficha de ${user.display_name}`}
                    className="absolute inset-0"
                  />

                  {user.avatar_url ? (
                    // Ya está en Supabase; <img> evita configurar next/image aquí.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-[11px] font-extrabold text-muted">
                      {initials(user.display_name)}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-bold">
                      <span className="truncate group-hover:underline">
                        {user.display_name}
                      </span>
                      <span
                        className={`rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-bold ${
                          user.role === "admin"
                            ? "bg-accent text-accent-foreground"
                            : "bg-chip text-muted"
                        }`}
                      >
                        {ROLE_LABELS[user.role]}
                      </span>
                      {isMe && <span className="text-xs font-semibold text-muted">(tú)</span>}
                    </p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                    <p className="text-xs text-muted">
                      {user.news_count === 0
                        ? "Sin noticias firmadas"
                        : `${user.news_count} ${
                            user.news_count === 1 ? "noticia firmada" : "noticias firmadas"
                          }`}
                    </p>
                  </div>

                  <div className="relative ml-auto flex items-center gap-4 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(user.id);
                        setEdit({
                          display_name: user.display_name,
                          role: user.role,
                          password: "",
                          is_columnist: user.is_columnist,
                          column_name: user.column_name ?? "",
                          tagline: user.tagline ?? "",
                          bio: user.bio ?? "",
                        });
                        setError(null);
                        setNotice(null);
                      }}
                      className="py-1 underline"
                    >
                      Editar
                    </button>

                    {/*
                      Eliminarse a sí mismo ni se ofrece. La API también lo
                      rechaza, y entre eso y no poder cambiarse el rol es lo que
                      garantiza que el panel nunca se quede sin administradores.
                    */}
                    {!isMe && (
                      <button
                        type="button"
                        onClick={() => remove(user)}
                        disabled={pending}
                        className="py-1 text-accent underline"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * La casilla de columnista y el texto de su columna.
 *
 * Los tres campos solo aparecen con la casilla marcada: a una cuenta que no es
 * columnista no le sirven, y desmarcarla no los borra —siguen guardados por si
 * se vuelve a marcar—, simplemente dejan de salir en /opinion.
 *
 * El mismo bloque sirve para el alta y para la edición: son los mismos campos y
 * las mismas reglas, y duplicarlos sería garantizar que un día se desfasen.
 */
function ColumnistFieldset({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
}) {
  return (
    <fieldset className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
      <legend className="sr-only">Columnista de Opinión</legend>

      <label className="flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={draft.is_columnist}
          onChange={(e) => onChange({ is_columnist: e.target.checked })}
          className="mt-0.5"
        />
        <span>
          <span className="font-semibold">Columnista de Opinión</span>
          <span className="mt-0.5 block text-xs text-muted">
            Sus notas de la sección de Opinión salen con su nombre y su columna
            al frente, y tiene página propia de columnista. No cambia sus
            permisos: eso lo decide el rol.
          </span>
        </span>
      </label>

      {draft.is_columnist && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre de la columna">
            <input
              value={draft.column_name}
              onChange={(e) => onChange({ column_name: e.target.value })}
              maxLength={80}
              placeholder="Ecos de la Sierra"
              className={INPUT}
            />
          </Field>

          <Field label="Frase corta">
            <input
              value={draft.tagline}
              onChange={(e) => onChange({ tagline: e.target.value })}
              maxLength={120}
              placeholder="Analista política"
              className={INPUT}
            />
          </Field>

          <Field
            label="Semblanza"
            hint="Va en la cabecera de su página de columnista."
            className="sm:col-span-2"
          >
            <textarea
              value={draft.bio}
              onChange={(e) => onChange({ bio: e.target.value })}
              maxLength={1200}
              rows={4}
              className={INPUT}
            />
          </Field>
        </div>
      )}
    </fieldset>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <span className="text-xs font-bold">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: AdminRole;
  onChange: (role: AdminRole) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as AdminRole)}
      className={`${INPUT} disabled:opacity-50`}
    >
      {ADMIN_ROLES.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </select>
  );
}
