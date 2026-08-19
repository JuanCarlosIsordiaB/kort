-- Notas recomendadas intercaladas en el cuerpo del artículo.
--
-- La idea: quien va leyendo se topa con una tarjeta a la altura del primer
-- cuarto del texto y otra en el último cuarto. Sirven para que la visita no
-- termine en la nota que abrió.

-- ---------------------------------------------------------------------------
-- news_recommendations
-- ---------------------------------------------------------------------------
-- Los picks manuales de una nota. Misma forma que `home_slots` y por la misma
-- razón: son *ordenados* (la 1 sale arriba, la 2 abajo) y una nota puede no
-- tener ninguno. Vacío no es un error, es el caso normal: significa "elige tú".
--
-- `on delete cascade` en las dos llaves: borrar una nota la saca de su propio
-- bloque y de las recomendaciones de las demás.

create table if not exists public.news_recommendations (
  id             uuid primary key default gen_random_uuid(),
  news_id        uuid not null references public.news(id) on delete cascade,
  position       int  not null check (position between 1 and 2),
  target_news_id uuid not null references public.news(id) on delete cascade,
  unique (news_id, position),
  -- Una nota no se recomienda a sí misma. Se prohíbe aquí y no solo en el
  -- panel porque es una regla del dato, no de la pantalla.
  constraint news_recommendations_not_self check (news_id <> target_news_id)
);

create index if not exists news_recommendations_news_id_position_idx
  on public.news_recommendations (news_id, position);

alter table public.news_recommendations enable row level security;

drop policy if exists "recomendaciones visibles para todos" on public.news_recommendations;
create policy "recomendaciones visibles para todos"
  on public.news_recommendations for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Ajustes globales
-- ---------------------------------------------------------------------------
-- Cuántas tarjetas, de dónde salen cuando no hay picks manuales, y con qué
-- rótulo se presentan. Viven en `site_settings` porque son una decisión del
-- sitio: si mañana se decide que estorban, se apagan en un lugar y no nota
-- por nota.
--
-- `inline_recos_source`:
--   'latest'   → lo más reciente publicado (el default que se pidió)
--   'category' → primero lo más reciente de la misma sección, y si no alcanza
--                se completa con lo más reciente de cualquiera

alter table public.site_settings
  add column if not exists inline_recos_count int not null default 2,
  add column if not exists inline_recos_source text not null default 'latest',
  add column if not exists inline_recos_label text not null default 'Te recomendamos';

do $$
begin
  alter table public.site_settings
    add constraint site_settings_inline_recos_count_check
    check (inline_recos_count between 0 and 2);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.site_settings
    add constraint site_settings_inline_recos_source_check
    check (inline_recos_source in ('latest', 'category'));
exception when duplicate_object then null;
end $$;
