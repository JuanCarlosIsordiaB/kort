# 📰 Proyecto: Sitio de Noticias

## 1. Descripción general

Sitio web de noticias construido con Next.js. Cuenta con una sección pública donde cualquier visitante puede leer las noticias, y una sección de administración protegida donde los administradores pueden crear, editar y publicar noticias con un editor de texto enriquecido (estilo Word).

**Diseño de referencia:** \_C:\Users\juanc\OneDrive\Escritorio\kort\Kort news page design (1).lnk

---

## 2. Stack tecnológico

| Capa                        | Tecnología                                                        |
| --------------------------- | ----------------------------------------------------------------- |
| Framework                   | Next.js (App Router)                                              |
| Backend                     | API Routes de Next.js (`/api`)                                    |
| Base de datos               | Supabase (Postgres)                                               |
| Almacenamiento de imágenes  | Supabase Storage                                                  |
| Autenticación               | Auth propio con JWT manual (solo admins, no hay registro público) |
| Editor de texto enriquecido | Tiptap                                                            |
| Estilos                     | Tailwind CSS (sugerido, ajustable)                                |

---

## 3. Estructura de carpetas propuesta

```
/app
  /(public)
    /page.tsx                 -> Home / listado de noticias
    /noticias/[slug]/page.tsx -> Detalle de una noticia
  /admin
    /layout.tsx                -> Layout protegido (valida sesión)
    /login/page.tsx             -> Login de admin
    /page.tsx                   -> Dashboard / listado noticias (admin)
    /noticias/nueva/page.tsx    -> Crear noticia (editor Tiptap)
    /noticias/[id]/editar/page.tsx -> Editar noticia
    /categorias/page.tsx        -> CRUD de secciones/categorías
  /categoria/[slug]/page.tsx    -> Listado público de noticias por sección
  /api
    /auth
      /login/route.ts          -> POST login, genera JWT
      /logout/route.ts         -> POST logout
      /me/route.ts              -> GET valida sesión actual
    /noticias
      /route.ts                 -> GET (listado público, filtrable por categoría), POST (crear, protegido)
      /[id]/route.ts             -> GET, PUT, DELETE (protegido excepto GET)
    /categorias
      /route.ts                  -> GET (público), POST (crear, protegido)
      /[id]/route.ts              -> PUT, DELETE (protegido)
    /upload
      /route.ts                  -> POST subir imagen a Supabase Storage

/lib
  /supabase.ts                  -> Cliente Supabase
  /auth.ts                      -> Firma/verifica JWT, helpers de sesión
  /middleware.ts                -> Protege rutas /admin y /api/noticias (métodos de escritura)

/components
  /editor/RichTextEditor.tsx    -> Wrapper de Tiptap
  /news/NewsCard.tsx
  /news/NewsDetail.tsx
  /admin/AdminSidebar.tsx
```

---

## 4. Modelo de datos (Supabase / Postgres)

### Tabla `admins`

| Campo         | Tipo        | Notas                           |
| ------------- | ----------- | ------------------------------- |
| id            | uuid        | PK, default `gen_random_uuid()` |
| email         | text        | unique                          |
| password_hash | text        | hash con bcrypt                 |
| created_at    | timestamptz | default `now()`                 |

### Tabla `categories`

| Campo      | Tipo        | Notas                                        |
| ---------- | ----------- | -------------------------------------------- |
| id         | uuid        | PK, default `gen_random_uuid()`              |
| name       | text        | ej. "Deportes", "Política"                   |
| slug       | text        | unique, generado del nombre (ej. `deportes`) |
| created_at | timestamptz | default `now()`                              |

> Las categorías las crea el admin dinámicamente desde el panel (no vienen precargadas fijas en código), así puede agregar/eliminar secciones sin tocar el código.

### Tabla `news`

| Campo           | Tipo        | Notas                                              |
| --------------- | ----------- | -------------------------------------------------- |
| id              | uuid        | PK                                                 |
| title           | text        |                                                    |
| slug            | text        | unique, generado del título                        |
| content         | jsonb       | contenido enriquecido en formato Tiptap (JSON)     |
| content_html    | text        | versión HTML renderizada (para SEO/lectura rápida) |
| cover_image_url | text        | URL de Supabase Storage                            |
| category_id     | uuid        | FK -> categories.id                                |
| status          | text        | `draft` \| `published`                             |
| author_id       | uuid        | FK -> admins.id                                    |
| published_at    | timestamptz | nullable                                           |
| created_at      | timestamptz | default `now()`                                    |
| updated_at      | timestamptz | default `now()`                                    |

> Nota: guardar el contenido tanto en `jsonb` (para poder re-editar en Tiptap) como en `content_html` (para renderizar rápido en el público) es la práctica recomendada.

---

## 5. Autenticación (JWT manual, solo admins)

- No hay registro público. Los admins se crean manualmente (seed script o Supabase Studio) con password hasheado (bcrypt).
- `POST /api/auth/login`: recibe email + password, verifica contra `admins`, firma un JWT (payload: `{ adminId, email }`) con `jsonwebtoken`, lo guarda en una cookie `httpOnly` + `secure` + `sameSite=strict`.
- `POST /api/auth/logout`: limpia la cookie.
- `GET /api/auth/me`: valida el JWT de la cookie y regresa los datos del admin.
- Middleware (`lib/middleware.ts` o `middleware.ts` de Next.js) protege:
  - Todas las rutas bajo `/admin/*` (excepto `/admin/login`) → redirige a login si no hay sesión válida.
  - Métodos `POST`, `PUT`, `DELETE` en `/api/noticias/*` y `/api/upload` → responde 401 si no hay JWT válido.
- Variables de entorno necesarias: `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (para escritura desde el server), `SUPABASE_ANON_KEY` (para lectura pública si aplica).

---

## 6. Editor de texto enriquecido (Tiptap)

Requisitos funcionales:

- Enter para nuevos párrafos / saltos de línea.
- Negritas, cursivas, subrayado.
- Cambiar color de texto (extensión `Color` + `TextStyle`).
- Resaltado / color de fondo (extensión `Highlight`).
- Encabezados (H1, H2, H3).
- Listas (ordenadas y no ordenadas).
- Insertar imágenes dentro del cuerpo de la noticia (no solo portada).
- Links.
- Toolbar tipo Word con botones para cada una de estas acciones.
- Guardar el contenido como JSON (Tiptap) y generar el HTML correspondiente al guardar (`editor.getHTML()`).

Extensiones sugeridas de Tiptap: `StarterKit`, `Color`, `TextStyle`, `Highlight`, `Image`, `Link`, `Underline`.

---

## 7. Endpoints de la API (`/api`)

| Método | Ruta                       | Descripción                                  | Protegido           |
| ------ | -------------------------- | -------------------------------------------- | ------------------- |
| POST   | `/api/auth/login`          | Login admin                                  | No                  |
| POST   | `/api/auth/logout`         | Logout                                       | Sí                  |
| GET    | `/api/auth/me`             | Sesión actual                                | Sí                  |
| GET    | `/api/noticias`            | Listado público (solo `published`)           | No                  |
| GET    | `/api/noticias?status=all` | Listado completo (para dashboard admin)      | Sí                  |
| GET    | `/api/noticias/[id]`       | Detalle de una noticia                       | No (si `published`) |
| POST   | `/api/noticias`            | Crear noticia                                | Sí                  |
| PUT    | `/api/noticias/[id]`       | Editar noticia                               | Sí                  |
| DELETE | `/api/noticias/[id]`       | Eliminar noticia                             | Sí                  |
| GET    | `/api/categorias`          | Listado de categorías                        | No                  |
| POST   | `/api/categorias`          | Crear categoría/sección                      | Sí                  |
| PUT    | `/api/categorias/[id]`     | Editar categoría                             | Sí                  |
| DELETE | `/api/categorias/[id]`     | Eliminar categoría                           | Sí                  |
| POST   | `/api/upload`              | Subir imagen a Supabase Storage, regresa URL | Sí                  |

---

## 8. Flujo de administración

1. Admin entra a `/admin/login`, ingresa email + password.
2. Al loguearse, se guarda cookie JWT y se redirige a `/admin` (dashboard).
3. Dashboard muestra listado de noticias (borrador/publicadas) con opción de crear nueva.
4. En "Secciones/Categorías" (`/admin/categorias`): el admin puede crear, renombrar o eliminar secciones (ej. Deportes, Política, Tecnología) libremente, sin límite fijo.
5. En "Crear noticia": título, imagen de portada (sube a Supabase Storage vía `/api/upload`), **selector de sección/categoría** (dropdown poblado desde `/api/categorias`), editor Tiptap para el cuerpo, selector de estado (`draft`/`published`).
6. Al guardar, se hace `POST /api/noticias` con el JSON del editor + HTML generado + `category_id`.
7. Página pública `/` lista noticias publicadas, con navegación por secciones (ej. `/categoria/deportes`); `/noticias/[slug]` muestra el detalle renderizando el `content_html` y muestra a qué sección pertenece.

> Nota sobre eliminar una categoría con noticias asociadas: definir si se bloquea el borrado, se reasignan a "Sin categoría", o se borran en cascada. Por defecto se sugiere bloquear el borrado si tiene noticias asociadas (evita perder la referencia).

---

## 9. Pendientes / decisiones abiertas

- [ ] Agregar referencia de diseño (archivo/imagen) para definir estilo visual final.
- [ ] Definir si habrá categorías/tags para las noticias.
- [ ] Definir si se permite más de un admin con roles distintos (editor vs. publicador) o todos con mismo permiso.
- [ ] Definir paginación del listado público (cuántas noticias por página).

---

## 10. Siguientes pasos para arrancar el proyecto

```bash
npx create-next-app@latest news-site --typescript --tailwind --app
cd news-site
npm install @supabase/supabase-js jsonwebtoken bcryptjs
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-color @tiptap/extension-text-style @tiptap/extension-highlight @tiptap/extension-image @tiptap/extension-link @tiptap/extension-underline
```

Crear proyecto en Supabase, correr las migraciones de las tablas `admins` y `news`, crear un bucket de Storage (ej. `news-images`) y configurar las variables de entorno en `.env.local`.
