-- La sección de Opinión viene de fábrica.
--
-- 0010_opinion.sql agregó `categories.kind` y marcó la sección de Opinión sólo
-- si ya existía una con ese nombre. Aquí se crea cuando no existe, para que
-- `/opinion` responda desde la primera instalación en vez de dar 404 hasta que
-- alguien se acuerde de marcarla a mano en el panel.
--
-- El slug es el que produciría `slugify('Opinión')` en lib/slug.ts: sin acento.
-- Mantenerlos iguales importa porque el panel recalcula el slug al renombrar.
--
-- Idempotente por partida doble, porque scripts/migrate.ts no lleva registro de
-- lo aplicado y vuelve a correr todos los archivos en cada `npm run db:migrate`:
--   · el `where not exists` no hace nada si ya hay una sección de Opinión
--     (sea ésta o una que el editor haya marcado después);
--   · el `on conflict (slug)` cubre el caso de que exista una sección con el
--     slug `opinion` pero todavía marcada como noticia: la convierte en vez de
--     estrellarse contra el índice único de slug.

insert into public.categories (name, slug, kind)
select 'Opinión', 'opinion', 'opinion'
 where not exists (select 1 from public.categories where kind = 'opinion')
    on conflict (slug) do update set kind = 'opinion';
