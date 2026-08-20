# Kort

Sitio de noticias con sección pública y panel de administración con editor de texto enriquecido.

Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase (Postgres + Storage) · Tiptap v3 · auth propia con JWT.

Ver [`PROJECT_SPEC.md`](./PROJECT_SPEC.md) para la especificación completa.

---

## Arranque

```bash
npm install
cp .env.local.example .env      # y llena los valores
npm run db:migrate              # crea tablas, RLS y el bucket de Storage
npm run seed:admin -- --email=tu@correo.com --password=... --name="Tu Nombre"   # rol admin
npm run dev
```

El panel queda en <http://localhost:3000/admin>.

### Variables de entorno

Van en `.env` o `.env.local` (los dos están en `.gitignore`).

| Variable                        | Para qué                                            |
| ------------------------------- | --------------------------------------------------- |
| `JWT_SECRET`                    | Firma las sesiones de admin                          |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL del proyecto                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Lecturas públicas (limitadas por RLS)                |
| `SUPABASE_SERVICE_ROLE_KEY`     | Escrituras desde el servidor — **nunca al navegador** |
| `DIRECT_URL` / `DATABASE_URL`   | Solo para `npm run db:migrate`                        |

---

## Scripts

| Comando               | Qué hace                                                    |
| --------------------- | ----------------------------------------------------------- |
| `npm run dev`         | Servidor de desarrollo                                       |
| `npm run build`       | Compilación de producción                                    |
| `npm run typecheck`   | `tsc --noEmit`                                               |
| `npm run lint`        | ESLint                                                       |
| `npm run db:migrate`  | Aplica `supabase/migrations/*.sql` en orden, en transacción   |
| `npm run seed:admin`  | Crea una cuenta del panel (o le cambia contraseña, nombre y rol si el correo ya existe) |
| `npm run import:wix`  | Importa el blog de Wix (`--dry` para simular sin escribir)     |

No hay registro público: las cuentas se dan de alta solo con `seed:admin`.

---

## Roles

Dos roles, en `admins.role` (ver `lib/auth/roles.ts`, que es la única tabla de
permisos del proyecto).

| | Administrador | Reportero |
| --- | --- | --- |
| Crear noticias | sí | sí |
| Editar y borrar noticias | todas | **solo las suyas** |
| Publicar (no solo guardar borrador) | sí | sí |
| Portada | sí | no |
| Secciones | sí | no |
| Publicidad | sí | no |
| Usuarios | sí | no |
| Estadísticas | sí | no |
| Mi perfil | sí | sí |

El día a día se hace desde **Usuarios** (`/admin/usuarios`), que solo ven los
administradores: dar de alta a alguien con su rol, cambiarle el nombre o el rol,
resetearle la contraseña y eliminar la cuenta.

Dos reglas que el panel no deja saltarse, y que juntas garantizan que nunca se
quede sin administradores: nadie puede cambiarse su propio rol ni eliminar su
propia cuenta. Quien manda la petición es administrador y no es el afectado, así
que después de aplicarla siempre queda al menos uno en pie. Un administrador que
quiera dejar de serlo se lo pide a otro.

Eliminar una cuenta no borra lo que publicó: `news.author_id` es
`on delete set null` y la byline vive desnormalizada en `news.author_name`, así
que las notas siguen publicadas y firmadas con su nombre.

`seed:admin` sigue existiendo para el arranque —cuando todavía no hay nadie que
pueda entrar al panel— y como salida de emergencia si se pierde la contraseña
del último administrador:

```bash
# alta de un reportero
npm run seed:admin -- --email=reportero@kort.mx --password=... --name="Nombre" --role=reportero

# subir a alguien a administrador (mismo comando, mismo correo)
npm run seed:admin -- --email=reportero@kort.mx --password=... --name="Nombre" --role=admin
```

Sin `--role` la cuenta queda como `admin`, igual que antes de que existieran los
roles. La migración `0008_roles.sql` también deja en `admin` a las cuentas que
ya existían: una migración no le quita acceso a nadie por su cuenta.

El rol viaja en el JWT solo para que el proxy pueda rebotar sin consultar la
base. Nada que escriba se apoya en él: la palabra final la tiene el rol de la
fila, que `getCurrentAdmin()` vuelve a leer en cada request. Por eso cambiarle
el rol a alguien surte efecto de inmediato, sin esperar a que caduque su sesión.

---

## Mantener viva la base

Supabase free **pausa el proyecto tras 7 días sin actividad**, y despausarlo es
manual desde el dashboard. `.github/workflows/keep-alive.yml` corre cada dos
días y hace una consulta de lectura contra `categories`; con eso el contador
nunca pasa de ~48 h.

Para que funcione hay que dar de alta dos secretos en el repo
(*Settings > Secrets and variables > Actions*):

| Secreto             | Valor                                     |
| ------------------- | ----------------------------------------- |
| `SUPABASE_URL`      | el mismo de `NEXT_PUBLIC_SUPABASE_URL`    |
| `SUPABASE_ANON_KEY` | el mismo de `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SITE_URL`          | opcional — si lo pones, también pinguea `/api/health` |

El workflow pega **directo a la API de Supabase**, no al sitio: así el
keep-alive no depende de que el despliegue esté arriba. `GET /api/health`
existe aparte, hace la misma consulta desde el servidor de Next y responde
`{ ok, db, categories, ms }` — sirve para un monitor externo (UptimeRobot,
cron-job.org) o para verificar a mano que la app ve la base.

> Dos cosas que conviene saber: el service role **no** va en el workflow —la
> anon key ya viaja al navegador por diseño y alcanza para leer categorías—, y
> GitHub deshabilita los workflows programados en repos sin commits durante 60
> días. Avisa por correo y se reactivan con un clic en la pestaña Actions.

---

## Cómo está organizado

```
app/
  (público)      page.tsx · noticias/[slug] · categoria/[slug]
  admin/
    login/       fuera del layout protegido, si no rebotaría contra sí mismo
    (panel)/     layout protegido + dashboard, secciones y editor
  api/           auth · noticias · categorias · anuncios · usuarios · vistas · upload
lib/
  auth/          jwt, cookie de sesión, roles/permisos y requireAdmin()
  data/          TODAS las consultas a la base viven aquí
  supabase/      cliente anon (lectura) y service role (escritura)
components/      editor Tiptap, tarjetas de noticia, chrome del sitio
proxy.ts         chequeo optimista de sesión sobre /admin/*
supabase/        migraciones SQL
```

### Dos cosas que conviene saber antes de tocar el código

**El middleware se llama `proxy.ts`.** En Next.js 16 el Middleware se renombró a Proxy: el archivo va en la raíz, exporta `proxy`, y corre en runtime de Node.js por defecto. Poner `export const runtime` ahí lanza un error.

**Las páginas públicas no hacen `fetch` a `/api`.** Son Server Components y llaman directo a `lib/data/*`, que es también lo que usan los route handlers. Un servidor pidiéndose datos a sí mismo por HTTP es un salto de red de más y rompe el renderizado estático. Las rutas `/api` existen para el panel, que es cliente porque el editor lo necesita.

### La portada

`/` reproduce el diseño del handoff: masthead, lead package, sidebar con pestañas Último minuto / Destacadas, barra "Ahora en Kort", rail de secciones + rejilla de 4, fila de Opinión, banda de boletín y pie.

Se cura desde **`/admin/portada`**. El modelo son dos tablas (migración `0002_home.sql`):

- **`home_slots`** — qué nota va en cada hueco (`lead`, `breaking`, `featured`, `opinion`) y en qué orden. Es tabla y no banderas en `news` porque los huecos son *ordenados* y una nota puede no estar en ninguno.
- **`site_settings`** — una sola fila (PK booleana con check) con el titular de portada en Tiptap y los textos del boletín y el pie.

Dos comportamientos que vale conocer:

**Todo hueco vacío se llena solo** con lo más reciente publicado, y un `Set` compartido evita que la misma nota aparezca en dos bloques. La portada nunca se ve rota por no haberla curado, y funciona desde la primera nota publicada sin configurar nada.

**El titular grande es un campo aparte del título del artículo.** En el diseño lleva una frase en recuadro invertido, y eso es una decisión de portada, no del artículo. Se escribe con una variante reducida del editor Tiptap (`variant="headline"`) donde la marca `highlight` se pinta como ese recuadro. Vacío = se usa el título de la nota.

> `/` es la única ruta con ISR (`revalidate = 300`), porque no lee params ni cookies y Next la prerenderizaría congelada. Por eso todo lo que la afecta —portada, noticias, secciones— llama a `revalidatePath("/")`. Si agregas otra ruta estática que muestre notas, acuérdate de lo mismo.

### La nota

**Galería.** Una nota tiene varias imágenes (`news_images`); el admin marca cuáles se ven y en qué orden desde el mismo formulario. Con dos o más visibles, la nota las rota cada 5 s — pausando al pasar el cursor y sin auto-avanzar si el sistema pide `prefers-reduced-motion`. Con una sola no monta nada de slider.

`news.cover_image_url` ya **no se escribe a mano**: es siempre la primera imagen visible, recalculada al guardar. Así las tarjetas, la portada y el Open Graph siguen leyendo una sola columna y el admin administra una sola cosa.

**Compartir.** WhatsApp, X, Facebook, copiar link y el diálogo nativo donde exista. La URL llega absoluta desde `lib/site.ts` (nunca `localhost`).

La vista previa la genera `app/noticias/[slug]/opengraph-image.tsx` en vez de mandar la foto original, y eso resuelve tres cosas de golpe: el convenio de archivo hace que Next inyecte `og:image` con URL absoluta y dimensiones —lo que suele faltar—; el título y el extracto van dentro de la imagen; y el peso baja de ~850 kb a ~100 kb, por debajo de lo que WhatsApp necesita para generar miniatura.

Dos detalles no obvios ahí: **satori solo decodifica PNG y JPEG**, y ocho de nuestras portadas son WebP o AVIF, así que se convierten con `sharp` antes de dibujarlas (sin eso la tarjeta salía sin foto). Y satori no lee woff2, que es lo que usa `next/font`, por eso hay TTF de Manrope vendorizados en `assets/fonts/`.

> En desarrollo `og:image` sale apuntando a `localhost` aunque `metadataBase` diga otra cosa: Next lo fuerza a propósito (ver `getSocialImageMetadataBaseFallback` en `next/dist/lib/metadata/resolvers/resolve-url.js`). En producción usa `metadataBase`. La vista previa real solo se puede comprobar tras desplegar.

**Ayudas de lectura.** Barra vertical de avance pegada al borde derecho y botón de volver arriba tras 800px. La barra mide el `<main>` de la nota, no la página completa: contando el masthead y el pie, arrancaría avanzada y llegaría al 100% antes del último párrafo.

**Recomendaciones dentro del texto.** El cuerpo de la nota se parte para colar una o dos tarjetas con otra nota: una pasando el primer cuarto, otra ya entrado el último. La idea es que la visita no termine donde empezó.

`lib/content-blocks.ts` corta el `content_html` por frontera de elemento de primer nivel —el único punto por donde se puede partir sin romper el marcado— y cada trozo se inyecta en su propio `.kort-prose`. No es un parser: es un contador de profundidad, y le alcanza porque la salida de Tiptap es una lista plana de bloques bien formados. La concatenación de los trozos es idéntica a la entrada, que es lo que permite volver a inyectarlos tal cual.

**Cuántas tarjetas salen lo decide el largo del texto, no el ajuste.** Lo que se configura es un máximo: hacen falta 6 bloques para una y 10 para dos. Dos recomendaciones en un texto de cuatro párrafos se leen como un anuncio con texto alrededor. Los cortes se corren si caerían justo después de un encabezado —lo dejarían huérfano de su sección— y nunca caen en el primer ni en el último par de bloques.

De dónde salen: manda lo que el admin haya elegido nota por nota (`news_recommendations`, misma forma que `home_slots` y por la misma razón: son ordenados y opcionales), y lo que falte se completa solo con lo más reciente publicado. Igual que la portada, curar es opcional.

El comportamiento global se fija en **`/admin/portada`**: cuántas (0, 1 o 2), si el relleno automático prefiere la misma sección, y el rótulo de la tarjeta. Un pick manual que se despublique después no rompe nada — `getInlineRecommendations` lo salta y el relleno toma el hueco, que es la razón por la que la existencia del id no se valida al guardar.

> Sin la migración aplicada el sitio no se cae: las consultas fallan, `data` viene `null` y todo cae al relleno automático. Lo que no funciona hasta migrar es guardar picks manuales.

### Publicidad

Campañas contratadas que se muestran como banner en huecos fijos, con su vigencia y su conteo de clics. Se administran en **`/admin/publicidad`**.

**Las zonas las define el código, no el panel.** `lib/ad-zones.ts` tiene el catálogo —siete huecos, cada uno con su tamaño— y quien administra elige uno de un desplegable. La alternativa que suena más flexible, dejar "poner publicidad en cualquier parte", significa meter una imagen de medidas arbitrarias en una maqueta diseñada: se rompe sola y además no habría nada que vender por ubicación. Es el mismo modelo que `home_slots`.

> Agregar una zona son **dos archivos**: la clave en `AD_ZONES` y el `check (zone in (...))` de `0006_ads.sql`. Tienen que decir lo mismo.

**Cuando hay varias campañas vigentes en el mismo hueco se rota al azar**, para poder venderlo a más de un anunciante el mismo mes. El alcance real de ese "al azar" conviene tenerlo claro: la portada y las notas se cachean 5 minutos, así que dentro de esa ventana todos ven el mismo banner y la rotación ocurre por regeneración, no por visita. A lo largo de una campaña de semanas el reparto sale parejo igual, y a cambio el banner llega en el HTML —sin JavaScript de cliente, sin parpadeo y sin una petición por hueco.

**El vencimiento no lo dispara nadie.** `getActiveAds` filtra por el día de hoy en `SITE_TIME_ZONE`, y la *policy de RLS filtra por lo mismo*. Esto último no es redundancia: la anon key viaja al navegador por diseño, y sin ese filtro en la policy cualquiera podría listar las campañas futuras y saber qué empresas contrataron y hasta cuándo. Eso es información comercial, no contenido. El panel lee con service role, así que sigue viendo las vencidas, las programadas y las pausadas, con su etiqueta.

**El clic pasa por `/api/anuncios/[id]/click`**, que suma y redirige con **302**. Un 301 lo cachearía el navegador para siempre y el segundo clic del mismo visitante ya no se contaría. El destino sale de la base por id y no de la URL, para que esto no sea un redirector abierto; que sea `http`/`https` se valida al guardar, que es lo que impide almacenar un `javascript:` y renderizarlo como `href` en una página pública.

Cada banner sale con el rótulo "PUBLICIDAD" y `rel="sponsored"`. En un sitio de noticias distinguir lo pagado de lo editorial es lo mínimo exigible, y `sponsored` es lo que Google espera de un enlace pagado.

> Ojo con `app/noticias/[slug]/page.tsx`: para que una nota se cachee **hacen falta las dos exportaciones**, `revalidate` y `generateStaticParams` devolviendo `[]`. `revalidate` a secas no hace nada en una ruta con segmento dinámico. Antes de esto la nota se renderizaba entera en cada visita.

### Estadísticas

Cuánta gente entra al sitio y qué nota se lee. Se ven en **`/admin/estadisticas`**, solo administradores.

**El conteo lo dispara el navegador, no el render.** Es la única forma correcta aquí: la portada y las notas se cachean 5 minutos, así que mil lectores dentro de esa ventana producen *un* render en el servidor. Contar ahí sería contar regeneraciones de caché. `ViewTracker` va montado en el layout raíz —cubre el sitio entero— y manda un `sendBeacon` a `POST /api/vistas` con la ruta y nada más.

**El navegador nunca dice a qué nota sumarle.** Manda la ruta; la función `track_view` de la base traduce `/noticias/<slug>` a un id ella sola, y solo si la nota está publicada. Un borrador abierto con el enlace directo no es audiencia. Es el mismo criterio que el clic de un anuncio: el cliente no elige el objetivo.

**Se guarda agregado por día, no una fila por visita.** `site_views` (día, páginas vistas, visitas) y `news_views` (nota, día, vistas). Una tabla de eventos crudos crece sin techo y obliga a un `group by` sobre cientos de miles de filas cada vez que alguien abre el panel; con el contador por día cada visita es un UPSERT sobre una fila que ya existe y el panel lee 30 filas para pintar un mes. Lo que se pierde es el detalle por visita (de dónde llegó, en qué orden navegó): si algún día hace falta un embudo, eso pide otra herramienta, no otra columna.

La distinción que importa al leer los números: **visitas** son navegadores distintos (la primera página de una pestaña, marcada con `sessionStorage`) y **páginas vistas** son todas, recargas incluidas.

`news.view_count` —la columna que existía desde `0001_init.sql` y que nadie escribía— ahora lleva el histórico de cada nota. Eso obligó a **acotar el trigger de `updated_at`**: sin la cláusula `when (old.view_count is not distinct from new.view_count)`, cada lectura movería la fecha de "actualizada" y el listado del panel —que ordena justo por ahí— pondría hasta arriba una nota vieja solo porque alguien la abrió.

Las tablas **no tienen ninguna policy de RLS**: cuánto tráfico tiene el sitio es información del negocio, no contenido, y la anon key vive en el navegador de cualquiera. Se escriben desde el servidor y se leen con service role.

**En desarrollo no se cuenta nada.** `next dev` apunta a la misma base que el sitio publicado, así que cada recarga mientras se programa acabaría sumada a los números de la redacción; `ViewTracker` sale temprano si `NODE_ENV` no es `production`. Para probar el conteo a mano, un `POST /api/vistas` con `{"path":"/noticias/<slug>"}` hace el mismo recorrido.

> El endpoint es público y escribe, así que se trata como entrada hostil: la ruta se valida contra un patrón, se descartan los user-agents de bots y hay un tope de 60 vistas por minuto y por IP. El tope vive en memoria del proceso —best effort—: si algún día hace falta de verdad, el lugar correcto es el borde, no el route handler.

### Perfil del autor

`admins.avatar_url` guarda la foto; `news.author_avatar_url` la copia en cada nota. Hace falta desnormalizar porque `admins` no es legible por anon.

La asimetría es deliberada: **el nombre no se propaga y la foto sí**. Una byline firmada es un registro histórico y no debe cambiar porque el autor se renombre; una foto de perfil, en cambio, es la persona de hoy, así que `PUT /api/perfil` la reescribe en todo lo que ese autor haya firmado.

#### Redes sociales

Cada quien las captura en `/admin/perfil` y salen como enlaces en su página (`/reportero/[slug]`), debajo de su nombre. Siete redes, una columna por red en `admins` — tres venían de `0010_opinion.sql`, las otras cuatro de `0011_redes.sql`.

El catálogo está en `lib/social.ts` y es lo único que hay que tocar para cambiar la lista: de ahí salen los campos del formulario, la validación del servidor y el orden en que se pintan.

Se acepta lo que la gente sabe de memoria (`@fulano`) o lo que trae pegado del navegador (la URL completa), y en los dos casos **se guarda siempre la URL ya armada**, para que la página pública no tenga que saber construir el enlace de cada red. Lo que no se acepta: un `javascript:` —acabaría siendo un `href` en una página que abre cualquiera— ni una URL de otro dominio bajo la etiqueta de una red, que es lo que permitiría poner un enlace a otro sitio diciendo "Instagram". Eso se revisa al guardar (`parseSocials`) y otra vez al pintar (`socialList`), porque una fila editada a mano en el SQL editor nunca pasó por lo primero.

Las URLs también van al JSON-LD como `sameAs`, que es lo que le dice a Google que la firma del sitio y esas cuentas son la misma persona.

### Tema claro/oscuro

Tres estados: sin elección guardada se sigue la preferencia del sistema; una vez que el usuario toca el botón, su elección manda y se guarda en `localStorage`.

El truco está en que **la ausencia** de `data-theme` en el `<html>` es lo que deja mandar al sistema — por eso el bloque oscuro va como `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`. Ese `:not()` es lo que permite quedarse en claro con el sistema en oscuro.

Un script inline en `<head>` (`lib/theme.ts`) escribe el atributo antes del primer pintado para que no haya destello, y el `<html>` lleva `suppressHydrationWarning` porque React encuentra ese atributo que él no renderizó.

`ThemeToggle` no usa estado de React: la etiqueta del botón ("Modo oscuro"/"Modo claro") la decide el CSS con `[data-theme-when]`, así dice lo correcto desde el primer pintado y no hay nada que sincronizar.

### Importación desde Wix

`scripts/wix/` migra el blog original (Body Moving / HarryOpiniones) a Kort:

```bash
npx tsx scripts/wix/fetch-feed.mts   # descarga el feed y los posts a .wix-cache/
npm run import:wix -- --dry          # simula
npm run import:wix                   # importa
```

Se separa la descarga de la importación porque Wix responde **429** si se le piden los 13 posts seguidos, y porque a veces devuelve una respuesta truncada (~277kb en vez de ~1200kb) que hay que reintentar.

El parser se ancla a `data-breakout` y `data-hook="figure-IMAGE"`, que son los atributos estables del visor "Ricos" de Wix — las clases CSS están ofuscadas y cambian entre despliegues.

Tres detalles que resuelve el importador: las imágenes se **espejan** a Supabase Storage (Kort no depende del CDN de Wix); se descarta la imagen del cuerpo cuando es la misma que la portada (Wix la repite en 12 de 13 notas); y `content_html` y `content` se generan de la **misma** lista de bloques, para que lo que se publica y lo que abre el editor no puedan divergir.

Es idempotente por slug: volver a correrlo actualiza en vez de duplicar.

### Seguridad

- RLS activo en las tres tablas. La anon key solo puede leer categorías y noticias `published`; `admins` es invisible y no hay ninguna policy de escritura.
- El proxy es un chequeo *optimista* — solo evita el parpadeo de UI. La verificación real es `requireAdmin()` / `requirePermission()`, que cada route handler protegido llama por su cuenta y que además confirma contra la base que el admin sigue existiendo y con qué rol.
- Esconder un enlace de la barra lateral es cortesía, no seguridad: cada página y cada endpoint que un reportero no puede tocar vuelve a comprobar el permiso, así que la URL escrita a mano devuelve un redirect o un 403.
- `lib/supabase/admin.ts` está marcado con `server-only`: importarlo desde un Client Component falla en build en vez de filtrar el service role al navegador.

### Detalle pendiente

`content_html` se inyecta con `dangerouslySetInnerHTML`. Hoy el contenido lo escriben admins de confianza, así que es aceptable, pero sanitizar el HTML al guardar es el endurecimiento correcto si alguna vez hay más de un editor.

---

## Lo que falta (segunda pasada)

La maquetación fiel al handoff de diseño: home con lead package y rail "Más leídas", rejilla de categorías, fila de Opinión, vista de artículo completa, las 4 pantallas mobile con tab bar, la página de búsqueda y "Guardados".

Los tokens de ambos temas ya están en `app/globals.css` y el esquema ya tiene las columnas que esas pantallas necesitan (`author_name`, `excerpt`, `read_minutes`, y `view_count`, que desde las estadísticas ya viene con datos reales), así que esa pasada es solo UI.
