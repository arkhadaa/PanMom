-- =============================================
-- supabase-roles.sql
-- Crea la tabla de usuarios con PIN y roles
-- Ejecutar en Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS usuarios_pin (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  pin VARCHAR(10) NOT NULL UNIQUE,
  rol VARCHAR(20) NOT NULL DEFAULT 'vendedor' -- 'admin' o 'vendedor'
);

-- Habilitar acceso de lectura
ALTER TABLE usuarios_pin ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir lectura de usuarios" ON usuarios_pin FOR SELECT USING (true);
CREATE POLICY "Permitir actualizar usuarios" ON usuarios_pin FOR UPDATE USING (true); -- Por si quieren cambiar el PIN después

-- Insertar usuarios por defecto (Ignorar si ya existen)
INSERT INTO usuarios_pin (nombre, pin, rol) VALUES
  ('Mamá', '1111', 'admin'),
  ('Papá', '2222', 'admin'),
  ('Hermano', '3333', 'vendedor'),
  ('Angel', '9900', 'superadmin')
ON CONFLICT (pin) DO NOTHING;
