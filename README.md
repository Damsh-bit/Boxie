# Boxie Digital

Regalos digitales interactivos: el comprador personaliza una Boxie (una experiencia tipo historias) y el
destinatario la abre desde el celular con un link.

Reescritura del prototipo `Damsh-bit/boxiedigital` según el
[documento de arquitectura y roadmap](https://boxie-roadmap.vercel.app/). Las decisiones tomadas al
implementarlo están en [docs/DECISIONES.md](docs/DECISIONES.md) y la operación (variables, deploy,
Supabase) en [docs/OPERACION.md](docs/OPERACION.md).

## Stack

Next.js 16 (App Router) + TypeScript estricto · Supabase (Postgres, Auth, Storage) · Mercado Pago ·
Resend · Tailwind 4 · Zod · Vitest + PGlite · Playwright · Vercel.

## Correr local

```bash
npm install
```

**Sin base de datos (modo demo):** catálogo desde `supabase/seed`, sin cobro. Alcanza para ver el sitio
y el player.

```bash
cp .env.example .env.local   # dejar DEMO_MODE=1
npm run dev
```

Abrir <http://localhost:3000> y, para ver una Boxie completa, <http://localhost:3000/ejemplo/pareja>.
El editor del comprador se prueba en <http://localhost:3000/ejemplo/pareja/personalizar> (modo
prueba: guarda en el navegador).

**Con Supabase local** (necesita Docker):

```bash
npm run db:start             # levanta Supabase y aplica supabase/migrations
npx supabase status          # copiar API URL, anon key y service_role key a .env.local
npm run dev
```

Con `PAYMENTS_PROVIDER=fake`, `POST /api/dev/boxies` crea una Boxie pagada y devuelve los links
del editor y del regalo (ver [docs/OPERACION.md](docs/OPERACION.md#editor-y-regalo)).

## Scripts

| Script                                  | Qué hace                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev` / `build` / `start`       | Next.js                                                                      |
| `npm test`                              | Vitest: dominio, motor de temáticas y **base de datos** (PGlite, sin Docker) |
| `npm run lint` / `typecheck` / `format` | Calidad                                                                      |
| `npm run db:types:gen`                  | Regenera `src/server/db/database.types.ts` desde las migraciones             |
| `npm run themes:migration`              | Regenera la migración del catálogo inicial desde `supabase/seed/themes`      |
| `npm run test:e2e`                      | Playwright (necesita Supabase local)                                         |

## Estructura

```
app/                  rutas (sitio público, checkout, editor, regalo, API)
src/domain/           lógica pura: precios, cupones, ciclo de vida de la Boxie
src/server/           todo lo que toca el exterior: base, storage, mails, seguridad
src/slides/           ⭐ el motor de temáticas: contrato de cada slide, player y componentes
src/slides/editor/    el editor del comprador: módulos, SchemaForm, fotos, modo prueba
src/ui/               sistema de diseño
supabase/migrations/  esquema, funciones, RLS, storage y catálogo inicial (versionado)
supabase/seed/        las temáticas iniciales como datos
tests/db/             tests de las migraciones y la RLS sobre PGlite
```

Regla de dependencias (la hace cumplir ESLint): `domain` no importa nada · `server` importa `domain` ·
`app` importa `server` y `domain` · los componentes nunca importan `server`.

## Estado

Ver el roadmap: <https://boxie-roadmap.vercel.app/#roadmap>.
