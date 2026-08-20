-- Sección de Opinión y perfil público de columnista.

-- ---------------------------------------------------------------------------
-- Una nota es de opinión por su sección, no por una bandera propia
-- ---------------------------------------------------------------------------
-- La alternativa era un booleano en `news`, pero entonces habría dos cosas que
-- mantener de acuerdo: la sección que elige quien captura y la marca que decide
-- cómo se pinta. Colgándolo de la sección, una columna se captura exactamente
-- como cualquier nota —mismo formulario, mismo select, mismo filtro del panel—
-- y lo único que cambia es dónde se lista y con qué tarjeta.
--
-- El índice parcial garantiza que haya una sola sección de Opinión: el sitio
-- tiene una página `/opinion`, no una por sección marcada.

alter table public.categories
  add column if not exists kind text not null default 'noticia';

do $$
begin
  alter table public.categories
    add constraint categories_kind_valid check (kind in ('noticia', 'opinion'));
exception when duplicate_object then null;
end $$;

create unique index if not exists categories_single_opinion_idx
  on public.categories (kind) where kind = 'opinion';

-- Si ya existe una sección que se llama así, es esa. Se marca sola para que
-- nadie tenga que acordarse de hacerlo a mano después de migrar.
update public.categories
   set kind = 'opinion'
 where id = (
   select id from public.categories
    where lower(name) in ('opinión', 'opinion')
    order by created_at
    limit 1
 )
   and not exists (select 1 from public.categories where kind = 'opinion');

-- ---------------------------------------------------------------------------
-- El perfil del columnista vive en `admins`
-- ---------------------------------------------------------------------------
-- Un columnista es una cuenta del sistema —firma sus notas desde el panel como
-- cualquier reportero—, así que su semblanza va junto a su nombre y su foto y
-- no en una tabla aparte que habría que casar por nombre.
--
-- El nombre de la columna NO se desnormaliza en `news` a propósito. La byline
-- (`news.author_name`) está congelada porque es un registro histórico; el
-- nombre de la columna es lo contrario: si el columnista la renombra, debe
-- cambiar en todo su archivo. Mismo criterio que ya rige `author_avatar_url`.
--
-- Todas nulables y todas seguras de exponer, a diferencia de `email` y
-- `password_hash`. La frontera pública sigue siendo `SELECT_COLUMNS` en
-- lib/data/reporters.ts, no RLS: `admins` se lee con el service role.

alter table public.admins
  add column if not exists is_columnist boolean not null default false,
  add column if not exists column_name  text,
  add column if not exists tagline      text,
  add column if not exists bio          text,
  add column if not exists x_url        text,
  add column if not exists facebook_url text,
  add column if not exists website_url  text;

-- La tira de columnistas de `/opinion` filtra por esta bandera y son pocos
-- frente al total de cuentas: índice parcial.
create index if not exists admins_columnist_idx
  on public.admins (is_columnist) where is_columnist;
