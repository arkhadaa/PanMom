-- =============================================
-- supabase-cierres.sql
-- Crea la tabla para el historial de cierres de caja diarios
-- Ejecutar en Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS cierres_caja (
  id SERIAL PRIMARY KEY,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT timezone('America/Santiago', now()),
  total_ingresos INTEGER NOT NULL DEFAULT 0,
  total_gastos INTEGER NOT NULL DEFAULT 0,
  total_retiros INTEGER NOT NULL DEFAULT 0,
  caja_final INTEGER NOT NULL DEFAULT 0,
  total_pedidos INTEGER NOT NULL DEFAULT 0,
  notas TEXT
);

-- Desactivamos la seguridad extrema de filas (RLS) para hacer el MVP rápido
ALTER TABLE cierres_caja DISABLE ROW LEVEL SECURITY;
GRANT ALL ON cierres_caja TO anon, authenticated;
