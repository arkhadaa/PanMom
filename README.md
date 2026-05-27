# 🍞 Pan & Sopaipillas — App de Gestión de Pedidos

App web interna para gestionar pedidos del negocio familiar de pan y sopaipillas. Funciona en celular y desktop con sincronización en tiempo real.

---

## ✨ Funcionalidades

- 📊 **Dashboard** con totales del día (panes, sopaipillas, dinero)
- ➕ **Agregar pedidos** con nombre, cantidades, monto y estado de pago
- 📋 **Lista de pedidos** con filtros, búsqueda y acciones rápidas
- 🔄 **Tiempo real**: cuando alguien agrega o actualiza un pedido, todos lo ven instantáneamente
- 📱 **Mobile-first**: diseñado para celular, funciona también en desktop

---

## 🚀 Configurar desde cero (20 minutos)

### Paso 1 — Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta gratuita
2. Haz clic en **New Project**
3. Escoge un nombre (ej: `pan-sopaipillas`), una contraseña fuerte y la región más cercana (South America - São Paulo)
4. Espera 2 minutos a que el proyecto se cree

### Paso 2 — Crear las tablas en Supabase

1. En el panel de Supabase, ve a **SQL Editor** (icono de base de datos)
2. Haz clic en **New Query**
3. Pega y ejecuta el siguiente SQL:

```sql
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

-- ─── ACTIVAR ROW LEVEL SECURITY (RLS) ──────────────────────────────────
-- Permite acceso público (sin autenticación) para app interna familiar
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso abierto (para uso interno familiar)
CREATE POLICY "Acceso total clientes"  ON clientes  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total pedidos"   ON pedidos   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total historial" ON historial FOR ALL USING (true) WITH CHECK (true);

-- ─── ACTIVAR REAL-TIME ─────────────────────────────────────────────────
-- Esto permite que los cambios se vean inmediatamente en todos los dispositivos
ALTER PUBLICATION supabase_realtime ADD TABLE pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE clientes;
```

4. Haz clic en **Run** (o Ctrl+Enter)

### Paso 3 — Obtener las credenciales

1. En Supabase, ve a **Settings** → **API**
2. Copia los dos valores:
   - **Project URL** (algo como `https://abcdefgh.supabase.co`)
   - **anon public** (clave larga que empieza con `eyJh...`)

### Paso 4 — Configurar las variables de entorno

1. En la carpeta del proyecto, copia el archivo de ejemplo:

```bash
cp .env.example .env.local
```

2. Abre `.env.local` y reemplaza los valores:

```env
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Paso 5 — Instalar y arrancar

```bash
npm install
npm run dev
```

La app abre en `http://localhost:5173` 🎉

---

## 📦 Desplegar en Vercel (5 minutos)

### Opción A — Desde GitHub (recomendado)

1. Sube el proyecto a GitHub:
```bash
git init
git add .
git commit -m "Primer commit - Pan App"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/pan-app.git
git push -u origin main
```

2. Ve a [vercel.com](https://vercel.com) → **New Project** → conecta tu repo de GitHub
3. En la sección **Environment Variables** agrega:
   - `VITE_SUPABASE_URL` = tu URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` = tu clave anon
4. Haz clic en **Deploy**

En 2 minutos tienes una URL del tipo `pan-app.vercel.app` ✨

### Opción B — Despliegue directo con CLI

```bash
npm install -g vercel
vercel
# Sigue las instrucciones, cuando pida variables de entorno, ingrésalas
```

---

## 📱 Cómo usar la app

### Para mamá (agregar pedidos)
1. Abre la app en el celular
2. Toca **Agregar** (tab de abajo)
3. Ingresa el nombre del cliente
4. Pon la cantidad de panes y/o sopaipillas
5. Escribe el monto en pesos
6. Activa el toggle si ya pagó
7. Toca **Guardar Pedido**

### Para papá (ver producción)
1. Abre la app → **Inicio** (Dashboard)
2. Ve el total de panes y sopaipillas a producir hoy
3. Ve a **Pedidos** para ver el detalle
4. Al terminar de hacer un pedido, toca **Marcar produciendo** → **Marcar listo**

### Para todos (cuando se entrega)
1. En **Pedidos**, busca el cliente
2. Toca **Marcar entregado**
3. Si pagó en ese momento, toca el badge "Debe" para cambiarlo a "Pagado"

---

## 🛠️ Estructura del proyecto

```
App  Pan/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Header.jsx          # Barra superior + nav mobile
│   │   ├── Dashboard.jsx       # Totales y estadísticas
│   │   ├── AgregarPedido.jsx   # Formulario nuevo pedido
│   │   ├── ListaPedidos.jsx    # Lista con filtros y acciones
│   │   └── EditarPedido.jsx    # Modal de edición
│   ├── services/
│   │   └── supabaseClient.js   # Conexión Supabase + CRUD
│   ├── App.jsx                 # Componente raíz + real-time
│   ├── main.jsx                # Entry point
│   └── index.css               # Sistema de diseño
├── .env.example                # Template de variables
├── index.html                  # HTML con meta tags mobile
├── vite.config.js              # Configuración Vite + Tailwind
└── package.json
```

---

## 🔧 Comandos útiles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Preview del build
```

---

## 🔮 Próximas funcionalidades (Fase 2)

- [ ] Historial de días anteriores
- [ ] Reportes semanales/mensuales
- [ ] Exportar a Excel
- [ ] Notificaciones push
- [ ] Portal para clientes (ver su pedido)
- [ ] Gestión de precios
- [ ] Login familiar (mama/papa/hermano)

---

## ❓ Problemas comunes

### La app muestra "Configuración necesaria"
→ Falta el archivo `.env.local` con las variables de Supabase. Sigue el **Paso 4**.

### Los cambios no se ven en tiempo real
→ Asegúrate de haber ejecutado el `ALTER PUBLICATION supabase_realtime...` del SQL.
→ En Supabase, ve a **Database → Replication** y verifica que `pedidos` esté habilitada.

### Error "permission denied"
→ Las políticas RLS no se crearon correctamente. Re-ejecuta el SQL del **Paso 2**.

---

Hecho con ❤️ para el negocio familiar 🥖
# PanMom
