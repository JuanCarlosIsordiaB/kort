-- Curaduría de la portada: qué nota va en cada hueco del diseño, más los
-- textos del sitio que el admin puede cambiar sin tocar código.

-- ---------------------------------------------------------------------------
-- home_slots
-- ---------------------------------------------------------------------------
-- Un renglón por hueco ocupado. Se modela como tabla y no como banderas en
-- `news` porque los huecos son ordenados (posición 1, 2, 3) y una misma nota
-- podría no estar en ninguno. Si un hueco queda vacío, la portada cae a lo más
-- reciente publicado — nunca se ve un espacio en blanco.
--
-- `on delete cascade`: borrar una nota la saca sola de la portada.

create table if not exists public.home_slots (
  id       uuid primary key default gen_random_uuid(),
  slot     text not null check (slot in ('lead', 'breaking', 'featured', 'opinion')),
  position int  not null check (position >= 1),
  news_id  uuid not null references public.news(id) on delete cascade,
  unique (slot, position)
);

create index if not exists home_slots_slot_position_idx
  on public.home_slots (slot, position);

-- ---------------------------------------------------------------------------
-- site_settings
-- ---------------------------------------------------------------------------
-- Una sola fila, forzada por la PK booleana con check: no puede haber dos.
--
-- `hero_headline_*` guarda el titular grande de la portada escrito en Tiptap.
-- Se guarda aparte del título de la nota a propósito: en el diseño ese titular
-- lleva una frase resaltada con recuadro invertido, y eso es una decisión de
-- portada, no del artículo. Si se deja vacío, se usa el título de la nota lead.

create table if not exists public.site_settings (
  id                 boolean primary key default true check (id),
  hero_headline_html text,
  hero_headline_json jsonb,
  newsletter_title   text not null default 'Lo esencial del día, en cinco minutos.',
  newsletter_label   text not null default 'BOLETÍN DIARIO',
  footer_tagline     text not null default 'NOTICIAS PARA GENTE QUE NO TIENE TODO EL DÍA',
  updated_at         timestamptz not null default now()
);

insert into public.site_settings (id) values (true) on conflict (id) do nothing;

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Lectura pública (la portada las necesita); escritura solo con service role.

alter table public.home_slots    enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "portada visible para todos" on public.home_slots;
create policy "portada visible para todos"
  on public.home_slots for select
  to anon, authenticated
  using (true);

drop policy if exists "ajustes visibles para todos" on public.site_settings;
create policy "ajustes visibles para todos"
  on public.site_settings for select
  to anon, authenticated
  using (true);
