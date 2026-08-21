-- Migración 001: Tabla de control de intentos de inicio de sesión
-- Almacena bloqueos por correo e IP para prevenir fuerza bruta.

CREATE TABLE IF NOT EXISTS public.login_attempts (
  identifier TEXT PRIMARY KEY,        -- Correo o IP del cliente
  attempt_count INTEGER NOT NULL DEFAULT 0,  -- Intentos fallidos acumulados
  locked_until TIMESTAMPTZ,           -- Fecha/hora hasta la que está bloqueado (NULL = no bloqueado)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()  -- Última actualización
);

-- Índice para limpieza periódica de registros antiguos (>24h)
CREATE INDEX IF NOT EXISTS idx_login_attempts_updated_at ON public.login_attempts(updated_at);

-- Allow upsert from the server (service role or authenticated server)
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only the service role / server can access this table
CREATE POLICY "Server only" ON public.login_attempts
  FOR ALL
  USING (auth.role() = 'service_role');
