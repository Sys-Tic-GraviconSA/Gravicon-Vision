import type { Plugin } from 'vite'

/**
 * Plugin de Vite que monta un servidor Express para las rutas de la API
 * durante el desarrollo. Las API routes se sirven en /api/* junto con el
 * frontend de Vite, evitando tener que ejecutar un servidor aparte.
 * @returns Plugin de Vite configurado.
 */
export function apiServer(): Plugin {
  return {
    name: 'api-server',
    async configureServer(server) {
      const dotenv = await import('dotenv')
      dotenv.config({ path: '.env.local' })

      const { default: express } = await import('express')
      const { default: helmet } = await import('helmet')
      const { default: rateLimit } = await import('express-rate-limit')
      const { createApiRouter } = await import('./api-routes.js')

      const app = express()

      // Seguridad: headers HTTP con helmet
      app.use(helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co", "https://cdn-icons-png.flaticon.com"],
            connectSrc: ["'self'", "https://*.supabase.co"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
          },
        },
        crossOriginEmbedderPolicy: false,
        referrerPolicy: { policy: 'same-origin' },
      }))

      // Rate limiting global: 60 peticiones/minuto en /api/
      const limiter = rateLimit({
        windowMs: 60_000,
        max: 60,
        standardHeaders: true,
        legacyHeaders: false,
      })
      app.use('/api/', limiter)

      // Rate limit específico para login: 10 intentos/minuto
      const loginLimiter = rateLimit({
        windowMs: 60_000,
        max: 10,
        message: { error: 'Demasiadas peticiones de inicio de sesión. Por favor intente más tarde.' },
        standardHeaders: true,
        legacyHeaders: false,
      })

      app.use(express.json({ limit: '10kb' })) // Body parser con límite de 10KB

      // Monta todas las rutas de la API bajo /api
      app.use('/api', createApiRouter(loginLimiter))

      server.middlewares.use(app)
    },
  }
}
