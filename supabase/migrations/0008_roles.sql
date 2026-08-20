-- Roles del panel: `admin` y `reportero`.

-- ---------------------------------------------------------------------------
-- Por qué una columna y no una tabla de permisos
-- ---------------------------------------------------------------------------
-- La redacción tiene dos figuras y no se espera una tercera con un recorte
-- distinto: quien manda el sitio y quien escribe. Una tabla de roles/permisos
-- serían tres joins para responder algo que aquí es un `text` con CHECK, y el
-- código tendría que resolver en tiempo de ejecución un conjunto de reglas que
-- en realidad está fijo en `lib/auth/roles.ts`.
--
-- El default es 'admin' a propósito: hasta ahora todas las cuentas tenían
-- permisos completos, y una migración no debe quitarle acceso a nadie por su
-- cuenta. Las cuentas nuevas eligen su rol al crearse (scripts/seed-admin.ts).

alter table public.admins
  add column if not exists role text not null default 'admin';

do $$
begin
  alter table public.admins
    add constraint admins_role_valid check (role in ('admin', 'reportero'));
exception when duplicate_object then null;
end $$;

-- El listado del panel de un reportero filtra por `author_id`, y el conteo de
-- noticias por sección ya recorría la tabla completa.
create index if not exists news_author_id_idx on public.news (author_id);

-- Las dos cuentas de dirección, explícitas. Si todavía no existen esto no hace
-- nada: se dan de alta con `npm run seed:admin -- --role=admin ...`.
update public.admins
   set role = 'admin'
 where email in ('c4rlos.arf@gmail.com', 'lauroramosrdz@gmail.com');
