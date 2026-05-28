// =============================================
// helpers.js
// Utilidades puras: formato de moneda, badges,
// conversión de unidades y costo de insumos.
// No depende de Supabase.
// =============================================

// ──────────────────────────────────────────
// FORMATO DE MONEDA Y ESTADO
// ──────────────────────────────────────────

/** Formatea pesos chilenos. Ej: 15235 → "$15.235" */
export function formatearPesos(monto) {
  return `$${Number(monto || 0).toLocaleString('es-CL')}`
}

export const LABELS_ESTADO = {
  pendiente:   'Pendiente',
  produciendo: 'Produciendo',
  listo:       'Listo',
  entregado:   'Entregado',
}

export function claseBadgeEstado(estado) {
  const mapa = {
    pendiente:   'badge-pendiente',
    produciendo: 'badge-produciendo',
    listo:       'badge-listo',
    entregado:   'badge-entregado',
  }
  return mapa[estado] || 'badge-pendiente'
}

// ──────────────────────────────────────────
// CONVERSIÓN DE UNIDADES
// Todo se guarda en unidad base: g (peso) o ml (volumen).
// El frontend convierte al leer/escribir.
// ──────────────────────────────────────────

/** Convierte cantidad + unidad entrada → valor en unidad base (g, ml, unidad). */
export function aBaseUnit(cantidad, unidadEntrada) {
  const v = Number(cantidad) || 0
  switch (unidadEntrada) {
    case 'kg':    return { valor: v * 1000, unidad: 'g'      }
    case 'g':     return { valor: v,        unidad: 'g'      }
    case 'litro': return { valor: v * 1000, unidad: 'ml'     }
    case 'ml':    return { valor: v,        unidad: 'ml'     }
    default:      return { valor: v,        unidad: 'unidad' }
  }
}

/** Convierte valor en unidad base → cantidad + unidad amigable para UI. */
export function deBaseUnit(valorBase, unidadBase) {
  if (unidadBase === 'g') {
    if (valorBase >= 1000) return { cantidad: valorBase / 1000, unidad: 'kg'    }
    return                        { cantidad: valorBase,        unidad: 'g'     }
  }
  if (unidadBase === 'ml') {
    if (valorBase >= 1000) return { cantidad: valorBase / 1000, unidad: 'litro' }
    return                        { cantidad: valorBase,        unidad: 'ml'    }
  }
  return { cantidad: valorBase, unidad: 'unidad' }
}

/** Formatea un valor base como string legible. Ej: 25000g → "25 kg". */
export function formatearCantidad(valorBase, unidadBase) {
  const { cantidad, unidad } = deBaseUnit(valorBase, unidadBase)
  const num = Number.isInteger(cantidad) ? cantidad : parseFloat(cantidad.toFixed(3))
  return `${num} ${unidad}`
}

/** Unidades de entrada válidas para cada unidad base. */
export const UNIDADES_POR_BASE = {
  g:      ['kg', 'g'],
  ml:     ['litro', 'ml'],
  unidad: ['unidad'],
}

// ──────────────────────────────────────────
// COSTOS DE INSUMOS
// ──────────────────────────────────────────

/** Costo por unidad base de un insumo. Ej: harina → $/g. */
export function costoUnitBase(insumo) {
  return insumo.cantidad_compra > 0
    ? insumo.precio_compra / insumo.cantidad_compra
    : 0
}

/** Formatea el costo de un insumo en unidad amigable. Ej: "$609/kg". */
export function formatearCostoInsumo(insumo) {
  const cBase = costoUnitBase(insumo)
  if (insumo.unidad === 'g')  return `${formatearPesos(Math.round(cBase * 1000))}/kg`
  if (insumo.unidad === 'ml') return `${formatearPesos(Math.round(cBase * 1000))}/litro`
  return `${formatearPesos(Math.round(cBase))}/unidad`
}
