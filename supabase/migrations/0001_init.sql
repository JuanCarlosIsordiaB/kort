-- Kort — esquema inicial
-- Pegar completo en el SQL Editor de Supabase Studio y ejecutar.
-- Es idempotente: se puede volver a correr sin romper nada.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- admins
-- ---------------------------------------------------------------------------
-- No hay registro público. Los admins se crean con scripts/seed-admin.ts.
-- Un solo rol: todos los admins tienen los mismos permisos.

create table if not exists public.admins (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  display_name  text not null,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
-- Las crea el admin desde el panel; no vienen precargadas en código.

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- news
-- ---------------------------------------------------------------------------
-- `content` guarda el JSON de Tiptap (para re-editar) y `content_html` el HTML
-- ya renderizado (para leer rápido en público). Se escriben juntos al guardar.
--
-- El borrado de una categoría con noticias se bloquea en la API (409) antes de
-- llegar aquí; `on delete restrict` es el respaldo a nivel de base de datos.

create table if not exists public.news (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null unique,
  excerpt         text,
  content         jsonb,
  content_html    text,
  cover_image_url text,
  category_id     uuid references public.categories(id) on delete restrict,
  status          text not null default 'draft' check (status in ('draft', 'published')),
  author_id       uuid references public.admins(id) on delete set null,
  -- El nombre del autor va desnormalizado a propósito. Dos razones:
  -- 1) La tabla `admins` no es legible por anon (ahí viven los password_hash),
  --    así que el listado público no puede resolver la byline con un join.
  -- 2) Una byline es un registro histórico: si el admin se renombra después,
  --    los artículos que ya firmó deben seguir mostrando el nombre con el que
  --    los firmó.
  author_name     text,
  read_minutes    int,
  view_count      int not null default 0,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists news_status_published_at_idx
  on public.news (status, published_at desc);
create index if not exists news_category_id_idx
  on public.news (category_id);

-- updated_at automático en cada UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists news_set_updated_at on public.news;
create trigger news_set_updated_at
  before update on public.news
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- La anon key viaja al navegador por diseño, así que la base tiene que asumir
-- que cualquiera la tiene. Con RLS activo y solo estas policies de lectura, esa
-- llave no alcanza para ver borradores ni para tocar la tabla de admins.
--
-- Toda escritura pasa por el service role key, que ignora RLS y solo existe en
-- el servidor. Por eso no hay ninguna policy de insert/update/delete aquí.

alter table public.admins     enable row level security;
alter table public.categories enable row level security;
alter table public.news       enable row level security;

-- admins: sin policies -> invisible para anon y authenticated.

drop policy if exists "categorias visibles para todos" on public.categories;
create policy "categorias visibles para todos"
  on public.categories for select
  to anon, authenticated
  using (true);

drop policy if exists "solo noticias publicadas son visibles" on public.news;
create policy "solo noticias publicadas son visibles"
  on public.news for select
  to anon, authenticated
  using (status = 'published');

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
-- Bucket público de lectura para portadas e imágenes del cuerpo.
-- Las subidas van por POST /api/upload usando el service role.

insert into storage.buckets (id, name, public)
values ('news-images', 'news-images', true)
on conflict (id) do update set public = true;
