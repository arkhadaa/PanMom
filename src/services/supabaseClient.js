// =============================================
// supabaseClient.js — barrel de re-exportación
//
// Los componentes siguen importando desde aquí.
// La lógica real está dividida en módulos:
//
//   supabase.js    → instancia del cliente
//   helpers.js     → formato, badges, unidades
//   pedidos.js     → CRUD pedidos + real-time
//   productos.js   → catálogo de productos
//   gastos.js      → gastos del día
//   retiros.js     → retiros + caja del día
//   insumos.js     → materias primas
//   recetas.js     → recetas + cálculo de costos
//   produccion.js  → cargas horneadas
//   seed.js        → datos iniciales automáticos
// =============================================

export * from './supabase'
export * from './helpers'
export * from './pedidos'
export * from './productos'
export * from './gastos'
export * from './retiros'
export * from './insumos'
export * from './recetas'
export * from './produccion'
export * from './seed'
export * from './auth'
export * from './cierres'
export * from './auditoria'
export * from './cuentaCliente'
export * from './analitica'
