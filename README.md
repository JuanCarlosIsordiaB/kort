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
npm run seed:admin -- --email=tu@correo.com --password=... --name="Tu Nombre"
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
| `npm run seed:admin`  | Crea un admin (o le cambia la contraseña si el correo ya existe) |
| `npm run import:wix`  | Importa el blog de Wix (`--dry` para simular sin escribir)     |

No hay registro público: los admins se dan de alta solo con `seed:admin`.

---

## Cómo está organizado

```
app/
  (público)      page.tsx · noticias/[slug] · categoria/[slug]
  admin/
    login/       fuera del layout protegido, si no rebotaría contra sí mismo
    (panel)/     layout protegido + dashboard, secciones y editor
  api/           auth · noticias · categorias · upload
lib/
  auth/          jwt, cookie de sesión y requireAdmin()
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
- El proxy es un chequeo *optimista* — solo evita el parpadeo de UI. La verificación real es `requireAdmin()`, que cada route handler protegido llama por su cuenta y que además confirma contra la base que el admin sigue existiendo.
- `lib/supabase/admin.ts` está marcado con `server-only`: importarlo desde un Client Component falla en build en vez de filtrar el service role al navegador.

### Detalle pendiente

`content_html` se inyecta con `dangerouslySetInnerHTML`. Hoy el contenido lo escriben admins de confianza, así que es aceptable, pero sanitizar el HTML al guardar es el endurecimiento correcto si alguna vez hay más de un editor.

---

## Lo que falta (segunda pasada)

La maquetación fiel al handoff de diseño: home con lead package y rail "Más leídas", rejilla de categorías, fila de Opinión, vista de artículo completa, las 4 pantallas mobile con tab bar, la página de búsqueda y "Guardados".

Los tokens de ambos temas ya están en `app/globals.css` y el esquema ya tiene las columnas que esas pantallas necesitan (`view_count`, `author_name`, `excerpt`, `read_minutes`), así que esa pasada es solo UI.
