-- Las redes sociales del periódico (no las de quien firma).
--
-- Viven en `site_settings` y no en una tabla nueva porque son parte de la
-- identidad del sitio, como `footer_tagline` o el titular de portada: una sola
-- fila, editada desde el mismo formulario y revalidada por el mismo `PUT`.
--
-- Los nombres de columna son idénticos a los de `admins` (0010_opinion.sql y
-- 0011_redes.sql) a propósito. `socialList()` en lib/social.ts recibe una fila
-- vista sólo por sus columnas de redes, así que compartir los nombres deja que
-- el pie del sitio y el perfil del columnista pasen por exactamente el mismo
-- catálogo, el mismo orden y la misma comprobación de http/https, sin traducir
-- nada en medio.
--
-- Falta `website_url` a propósito: es la única del catálogo que aquí no
-- significa nada — el sitio web del sitio es este mismo. Ver `SITE_SOCIAL_IDS`.

alter table public.site_settings
  add column if not exists x_url        text,
  add column if not exists facebook_url text,
  add column if not exists instagram_url text,
  add column if not exists tiktok_url   text,
  add column if not exists youtube_url  text,
  add column if not exists linkedin_url text;
