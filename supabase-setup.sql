# Historial de Pedidos - SQL
# Script SQL para Supabase - Pan & Sopaipillas App
# Ejecuta esto en SQL Editor de Supabase

-- ─── CLIENTES ──────────────────────────────────────────────────────────
CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(20),
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── PEDIDOS ──────────────────────────────────────────────────────────
CREATE TABLE pedidos (
  id SERIAL PRIMARY KEY,
  cliente_id INT REFERENCES clientes(id) ON DELETE SET NULL,
  cantidad_panes INT DEFAULT 0,
  cantidad_sopaipillas INT DEFAULT 0,
  monto_pesos INT DEFAULT 0,
  pagado BOOLEAN DEFAULT FALSE,
  estado VARCHAR(50) DEFAULT 'pendiente',
  notas TEXT,
  fecha_pedido TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_entrega TIMESTAMP WITH TIME ZONE
);

-- ─── HISTORIAL ─────────────────────────────────────────────────────────
CREATE TABLE historial (
  id SERIAL PRIMARY KEY,
  pedido_id INT REFERENCES pedidos(id) ON DELETE CASCADE,
  accion VARCHAR(100),
  usuario VARCHAR(50) DEFAULT 'sistema',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────────────────
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial ENABLE ROW LEVEL SECURITY;

-- Acceso abierto (app interna familiar, sin auth complejo)
CREATE POLICY "Acceso total clientes"  ON clientes  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total pedidos"   ON pedidos   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total historial" ON historial FOR ALL USING (true) WITH CHECK (true);

-- ─── REAL-TIME ─────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE clientes;
