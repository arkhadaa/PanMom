-- =============================================
-- supabase-gastos.sql  (tabla SIMPLE de gastos)
-- Ejecutar en Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS gastos (
  id SERIAL PRIMARY KEY,
  descripcion VARCHAR(100) NOT NULL,
  monto INT NOT NULL DEFAULT 0,
  fecha_gasto TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso total gastos"
  ON gastos FOR ALL USING (true) WITH CHECK (true);

-- Real-time (opcional, para ver gastos de otros dispositivos)
ALTER PUBLICATION supabase_realtime ADD TABLE gastos;
