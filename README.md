# Gravicon Vision — Dashboard de Monitoreo Industrial

Dashboard de monitoreo para Gravicon. Visualiza datos de producción de agregados (plantas Cuncia y Acacias), producción de concretos, información de clientes y estado de equipos, todo integrado con Google Sheets y Supabase.

## Tecnologías

- **Frontend:** Vue 3 + TypeScript + Pinia + Vue Router + ECharts (vue-echarts)
- **Backend API:** Express 5 (dev) / Vercel Serverless Functions (producción)
- **Base de datos:** Supabase (PostgreSQL + Auth)
- **Fuente de datos:** Google Sheets API (sheets.googleapis.com)
- **Build:** Vite 8 + vue-tsc
- **Seguridad:** Helmet, express-rate-limit, JWT, CSP, RLS

## Requisitos previos

- Node.js >= 18
- npm

## Configuración de entorno

Copia el archivo de ejemplo y completa las variables:

```bash
cp .env.example .env.local
```

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase (se expone al frontend) |
| `VITE_SUPABASE_ANON_KEY` | Llave anónima de Supabase (se expone al frontend, limitada por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave `service_role` de Supabase para operaciones administrativas (login, bloqueo de intentos, reset de password). **No exponer al frontend.** |
| `SPREADSHEET_PRODUCCION_CUNCIA` | ID del Google Sheet de producción de la planta Cuncia |
| `SPREADSHEET_PRODUCCION_ACACIAS` | ID del Google Sheet de producción de la planta Acacias |
| `SPREADSHEET_MANTENIMIENTO_CUNCIA` | ID del Google Sheet de mantenimiento de Cuncia |
| `SPREADSHEET_MANTENIMIENTO_ACACIAS` | ID del Google Sheet de mantenimiento de Acacias |
| `SPREADSHEET_PRODUCCION_CONCRETOS` | ID del Google Sheet de producción de concretos |
| `GOOGLE_PROJECT_ID` | ID del proyecto GCP para la service account |
| `GOOGLE_PRIVATE_KEY_ID` | ID de la clave privada de la service account |
| `GOOGLE_CLIENT_EMAIL` | Correo de la service account (`...@...iam.gserviceaccount.com`) |
| `GOOGLE_CLIENT_ID` | ID de cliente de la service account |
| `GOOGLE_PRIVATE_KEY` | Clave privada PEM de la service account |
| `GOOGLE_AUTH_URI` | `https://accounts.google.com/o/oauth2/auth` |
| `GOOGLE_TOKEN_URI` | `https://oauth2.googleapis.com/token` |
| `GOOGLE_AUTH_PROVIDER_CERT_URL` | `https://www.googleapis.com/oauth2/v1/certs` |
| `GOOGLE_CLIENT_X509_CERT_URL` | Certificado x509 de la service account |
| `APP_ENV` | `production` o `development` |
| `APP_DEBUG` | `true` / `false` |
| `CACHE_TTL` | TTL de caché en segundos (por defecto 300) |

## Instalación

```bash
npm install
```

## Ejecución en desarrollo

```bash
npm run dev
```

Inicia Vite en `http://localhost:5173`. El plugin `vite-plugin-api` monta un servidor Express embebido que sirve las rutas `/api/*` en el mismo puerto, replicando el entorno serverless de Vercel.

## Build

```bash
npm run build
```

Compila con `vue-tsc` y empaqueta con Vite en la carpeta `dist/`. Los chunks se separan automáticamente en `vendor-vue`, `vendor-echarts` y `vendor-supabase`.

## Estructura del proyecto

```
├── api/                    # Rutas Vercel Serverless Functions
│   ├── _lib/               # Librerías compartidas (google.ts, auth-helpers.ts)
│   ├── auth/               # Rutas de autenticación
│   ├── concreto/           # Endpoint /api/concreto/data
│   ├── proyecciones-clientes/  # Endpoint /api/proyecciones-clientes/data
│   ├── spreadsheets/       # Endpoint /api/spreadsheets/:key/data|meta|analyze
│   ├── analyze-all.ts      # Endpoint /api/analyze-all
│   ├── health.ts           # Endpoint /api/health
│   └── spreadsheets.ts     # Endpoint /api/spreadsheets
├── server/                 # Servidor Express para desarrollo
│   ├── index.ts            # Servidor Express independiente (npm run start)
│   ├── api-routes.ts       # Definición de rutas compartida (dev y Vite plugin)
│   ├── vite-plugin-api.ts  # Plugin de Vite que monta Express en dev
│   └── scripts/            # Scripts de servidor (análisis, etc.)
├── src/                    # Frontend Vue 3
│   ├── components/         # Componentes reutilizables
│   ├── composables/        # Composables (useTheme, etc.)
│   ├── lib/                # Clientes (supabase.ts)
│   ├── router/             # Configuración de Vue Router con guards de auth
│   ├── stores/             # Stores Pinia (auth, concreto)
│   ├── types/              # Tipos TypeScript
│   ├── utils/              # Utilidades
│   └── views/              # Vistas (login, producción, equipos, clientes, concretos)
├── supabase/               # Migraciones SQL de Supabase
│   └── 001_login_attempts.sql
├── scripts/                # Scripts CLI utilitarios
│   ├── create-user.ts      # Crear usuario en Supabase Auth
│   └── test-login.ts       # Probar login contra la API
├── public/                 # Assets estáticos (favicon, etc.)
├── .env.example            # Ejemplo de variables de entorno
├── vercel.json             # Configuración de despliegue Vercel
└── vite.config.ts          # Configuración de Vite
```

## Base de datos

El proyecto usa **Supabase** (PostgreSQL) con las siguientes tablas:

| Tabla | Propósito |
|---|---|
| `proyecciones_clientes` | Proyecciones por cliente (precios, volúmenes, fechas) |
| `order_price` | Precios de órdenes de concreto |
| `order_detail` | Detalle de órdenes (remisiones, tiempos) |
| `login_attempts` | Control de bloqueo por intentos fallidos de login |

La tabla `login_attempts` tiene **RLS (Row Level Security)** habilitado con una política que solo permite acceso al rol `service_role`. Las operaciones sobre esta tabla se realizan desde el backend usando `SUPABASE_SERVICE_ROLE_KEY`, no desde el frontend.

## Autenticación

El sistema usa **Supabase Auth** con **JWT**. El flujo es:

1. El frontend envía credenciales a `POST /api/auth/login`
2. El backend valida contra Supabase Auth, aplica rate limiting (10 intentos/minuto) y bloqueo por 15 minutos tras 5 intentos fallidos
3. Devuelve un `access_token` JWT que el frontend almacena en la sesión
4. Cada llamada a la API incluye el token en el header `Authorization: Bearer <token>`

### Crear un usuario

```bash
npx tsx scripts/create-user.ts <email> <password>
```

Requiere `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` definidos en `.env.local`.

## Despliegue

El proyecto está configurado para desplegarse en **Vercel** (`vercel.json`):

- **API:** Las rutas en `api/` se despliegan como Serverless Functions
- **Frontend:** SPA con `rewrites` que enrutan todo tráfico no-`/api` a `index.html`
- **Seguridad:** Headers HTTP (X-Frame-Options, CSP parcial vía HTML meta tag, etc.)
- **Build:** `npm run build` → output en `dist/`

### Variables de entorno en Vercel

Todas las variables de `.env.example` deben configurarse en el dashboard de Vercel (Project Settings → Environment Variables). `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` deben incluir `VITE_` para que Vite las exponga al frontend.
# Gravicon-Vision
