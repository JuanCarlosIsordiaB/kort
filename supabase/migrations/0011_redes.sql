-- Las redes sociales que faltaban en el perfil público.

-- ---------------------------------------------------------------------------
-- Por qué cuatro columnas más y no un `jsonb`
-- ---------------------------------------------------------------------------
-- 0010_opinion.sql ya había puesto `x_url`, `facebook_url` y `website_url` en
-- `admins` para el perfil de columnista. Faltaban las cuatro redes que el resto
-- de la redacción usa, y había dos caminos: agregarlas igual, o mover las tres
-- que ya existen a un `socials jsonb` con las llaves del catálogo.
--
-- Se agregaron. El catálogo es cerrado —está en lib/social.ts y cambia una vez
-- cada varios años—, así que el `jsonb` no compraba flexibilidad real: compraba
-- un backfill de datos ajenos, valores sin tipo que la base no puede revisar, y
-- que `SELECT_COLUMNS` en lib/data/reporters.ts —la frontera de lo que sale al
-- público— dejara de enumerar lo que expone. Una columna por red se lee, se
-- consulta y se audita como cualquier otro campo del perfil.
--
-- Todas nulables: nadie está obligado a dar sus redes, y `null` es "no tengo",
-- que es distinto de la cadena vacía. Lo que guarda el panel siempre es una URL
-- completa ya normalizada (`normalizeSocial`), nunca un "@usuario" suelto: así
-- la página pública no tiene que saber armar el enlace de cada red.
--
-- Igual que las de 0010, son seguras de exponer. La frontera pública sigue
-- siendo `SELECT_COLUMNS`, no RLS: `admins` se lee con el service role porque
-- ahí viven los `password_hash`.

alter table public.admins
  add column if not exists instagram_url text,
  add column if not exists tiktok_url    text,
  add column if not exists youtube_url   text,
  add column if not exists linkedin_url  text;
