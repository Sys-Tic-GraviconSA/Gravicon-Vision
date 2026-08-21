import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { createApiRouter } from './api-routes.js';

/**
 * Servidor Express independiente para desarrollo local.
 * Proporciona las mismas rutas que las serverless functions de Vercel,
 * más seguridad con helmet, rate limiting global y CORS configurable.
 */
const app = express();
const PORT = process.env.SERVER_PORT ?? 3001;

// Seguridad: headers HTTP con helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co"],
      connectSrc: ["'self'", "https://*.supabase.co"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'same-origin' },
}));

// Rate limiting global: 60 peticiones/minuto en /api/
const limiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Rate limit específico para login: 10 intentos/minuto
const loginLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: { error: 'Demasiadas peticiones de inicio de sesión. Por favor intente más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173'];

// CORS configurable desde variable de entorno ALLOWED_ORIGINS
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy does not allow access from this origin'), false);
  },
  credentials: true
}));
app.use(express.json({ limit: '10kb' })); // Body parser con límite de 10KB

// Monta todas las rutas de la API bajo /api
app.use('/api', createApiRouter(loginLimiter));

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
