import type { VercelRequest, VercelResponse } from '@vercel/node'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { createApiRouter } from '../server/api-routes.js'

const app = express()

// Vercel está detrás de un proxy: necesario para que req.ip (y el rate limit) usen la IP real.
app.set('trust proxy', 1)
app.disable('x-powered-by')

app.use(helmet({
  contentSecurityPolicy: false, // la API solo devuelve JSON; la CSP del frontend va en vercel.json
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'same-origin' },
}))

// Rate limiting por instancia (serverless): complementa el bloqueo persistente en login_attempts.
app.use('/api/', rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false }))

const loginLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: { error: 'Demasiadas peticiones de inicio de sesión. Por favor intente más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(express.json({ limit: '10kb' }))
app.use('/api', createApiRouter(loginLimiter))

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res)
}
