-- Varias imágenes por nota, y foto de perfil del admin.

-- ---------------------------------------------------------------------------
-- news_images
-- ---------------------------------------------------------------------------
-- Una nota puede tener varias fotos. El admin decide cuáles se ven y en qué
-- orden; la nota las muestra en un slider cuando hay más de una visible.
--
-- `news.cover_image_url` se conserva y pasa a ser derivada: siempre es la
-- primera imagen visible. Así todo lo que ya la consulta (tarjetas, lead,
-- Open Graph) sigue funcionando sin cambios.

create table if not exists public.news_images (
  id         uuid primary key default gen_random_uuid(),
  news_id    uuid not null references public.news(id) on delete cascade,
  url        text not null,
  alt        text,
  position   int  not null default 1 check (position >= 1),
  visible    boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists news_images_news_id_position_idx
  on public.news_images (news_id, position);

alter table public.news_images enable row level security;

-- Una imagen es pública si su nota lo es. El `exists` se apoya en la RLS que ya
-- tiene `news` (solo `published`), así que hereda esa regla en vez de
-- duplicarla: si mañana cambia la definición de "publicada", esto la sigue.
drop policy if exists "imagenes de notas publicadas" on public.news_images;
create policy "imagenes de notas publicadas"
  on public.news_images for select
  to anon, authenticated
  using (exists (select 1 from public.news n where n.id = news_id));

-- Backfill: cada portada que ya existe se convierte en la primera imagen de su
-- nota, para que ninguna pierda su foto al cambiar de modelo.
insert into public.news_images (news_id, url, position, visible)
select n.id, n.cover_image_url, 1, true
from public.news n
where n.cover_image_url is not null
  and not exists (select 1 from public.news_images i where i.news_id = n.id);

-- ---------------------------------------------------------------------------
-- Avatares
-- ---------------------------------------------------------------------------
-- `admins` no es legible por anon (ahí viven los password_hash), así que la
-- nota no puede resolver la foto del autor con un join. Se desnormaliza igual
-- que `author_name`.
--
-- Diferencia importante entre los dos campos: el nombre es registro histórico y
-- NO se propaga —una byline firmada no debe cambiar—, pero la foto sí, porque
-- una foto de perfil es la persona de hoy. `PUT /api/perfil` la reescribe en
-- todas las notas del autor.

alter table public.admins add column if not exists avatar_url text;
alter table public.news   add column if not exists author_avatar_url text;
