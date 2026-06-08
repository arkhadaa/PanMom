// =============================================
// recetas.js
// Recetas de producción: ingredientes, cálculo de
// costos por carga y resumen de rentabilidad.
// =============================================

import { supabase } from './supabase'
import { costoUnitBase } from './helpers'

// ──────────────────────────────────────────
// CRUD RECETAS
// ──────────────────────────────────────────

export async function listarRecetas() {
  const { data, error } = await supabase
    .from('recetas')
    .select(`
      *,
      receta_ingredientes (
        id, cantidad,
        insumos ( id, nombre, unidad, precio_compra, cantidad_compra )
      )
    `)
    .eq('activo', true)
    .order('nombre')
  if (error) throw error
  return data || []
}

export async function crearReceta({ nombre, panes_por_carga, precio_venta }) {
  const { data, error } = await supabase
    .from('recetas')
    .insert({
      nombre:          nombre.trim(),
      panes_por_carga: Number(panes_por_carga) || 1,
      precio_venta:    Number(precio_venta)    || 0,
    })
    .select()
    .single()
  if (error) throw error

  // Sincronizar: Crear automáticamente el producto para que se pueda vender
  await supabase.from('productos').insert({
    nombre: data.nombre,
    precio_venta: data.precio_venta,
    tiene_receta: true,
    receta_id: data.id,
    cantidad_panes: 1
  })

  return data
}

export async function editarReceta(id, { nombre, panes_por_carga, precio_venta }) {
  const { data, error } = await supabase
    .from('recetas')
    .update({
      nombre:          nombre.trim(),
      panes_por_carga: Number(panes_por_carga) || 1,
      precio_venta:    Number(precio_venta)    || 0,
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  // Sincronizar: Actualizar el producto vinculado
  await supabase.from('productos')
    .update({ nombre: data.nombre, precio_venta: data.precio_venta })
    .eq('receta_id', id)

  return data
}

export async function eliminarReceta(id) {
  // Sincronizar: Eliminar producto vinculado (soft-delete o hard delete)
  await supabase.from('productos').delete().eq('receta_id', id)
  const { error } = await supabase.from('recetas').delete().eq('id', id)
  if (error) throw error
}

// ──────────────────────────────────────────
// INGREDIENTES
// ──────────────────────────────────────────

/** Agrega un ingrediente a una receta. La cantidad debe estar en unidad base (g/ml). */
export async function agregarIngrediente({ receta_id, insumo_id, cantidad }) {
  const { data, error } = await supabase
    .from('receta_ingredientes')
    .insert({
      receta_id: Number(receta_id),
      insumo_id: Number(insumo_id),
      cantidad:  Number(cantidad),
    })
    .select('id, cantidad, insumos ( id, nombre, unidad, precio_compra, cantidad_compra )')
    .single()
  if (error) throw error
  return data
}

export async function eliminarIngrediente(id) {
  const { error } = await supabase.from('receta_ingredientes').delete().eq('id', id)
  if (error) throw error
}

// ──────────────────────────────────────────
// CÁLCULOS DE COSTOS
// ──────────────────────────────────────────

/**
 * Calcula costo, ingreso y margen de una receta (por carga y por unidad).
 * Requiere que la receta tenga `receta_ingredientes` con `insumos` cargados.
 */
export function calcularCostoReceta(receta) {
  let costoCarga = 0
  for (const ri of receta.receta_ingredientes || []) {
    const ins = ri.insumos
    if (!ins || !ins.cantidad_compra) continue
    costoCarga += costoUnitBase(ins) * ri.cantidad
  }
  const panesPorCarga    = receta.panes_por_carga || 1
  const precioVenta      = Number(receta.precio_venta) || 0
  const costoPorUnidad   = costoCarga / panesPorCarga
  const ingresoCarga     = precioVenta * panesPorCarga
  const gananciaUnitaria = precioVenta - costoPorUnidad
  const margen           = ingresoCarga > 0
    ? Math.round(((ingresoCarga - costoCarga) / ingresoCarga) * 100)
    : 0

  return {
    costoCarga:       Math.round(costoCarga),
    costoPorUnidad:   Math.round(costoPorUnidad),
    ingresoCarga:     Math.round(ingresoCarga),
    gananciaUnitaria: Math.round(gananciaUnitaria),
    margen,
  }
}

/**
 * Calcula costos unitarios de pan y sopaipilla para el Dashboard.
 * Busca recetas por nombre ("pan", "sopaipilla").
 */
export async function calcularCostosUnitarios() {
  const recetas = await listarRecetas()
  let costoPanUnitario        = 0
  let costoSopaipillaUnitario = 0
  let precioVentaPan          = 0
  let precioVentaSopaipilla   = 0

  for (const r of recetas) {
    const nombre = r.nombre.toLowerCase()
    const { costoPorUnidad } = calcularCostoReceta(r)
    if (nombre.includes('sopaipilla')) {
      costoSopaipillaUnitario = costoPorUnidad
      precioVentaSopaipilla   = Number(r.precio_venta) || 0
    } else if (nombre.includes('pan')) {
      costoPanUnitario = costoPorUnidad
      precioVentaPan   = Number(r.precio_venta) || 0
    }
  }
  return { costoPanUnitario, costoSopaipillaUnitario, precioVentaPan, precioVentaSopaipilla, recetas }
}

/** Resumen de costos de producción basado en pedidos (legacy, usa columnas cantidad_panes). */
export function calcularResumenCostos(pedidos, costoPanUnitario, costoSopaipillaUnitario) {
  const totalPanes       = pedidos.reduce((s, p) => s + (p.cantidad_panes       || 0), 0)
  const totalSopaipillas = pedidos.reduce((s, p) => s + (p.cantidad_sopaipillas || 0), 0)
  const ingresoTotal     = pedidos.reduce((s, p) => s + (p.monto_pesos          || 0), 0)
  const costoProduccionTotal =
    totalPanes * costoPanUnitario + totalSopaipillas * costoSopaipillaUnitario
  const gananciaEstimada = ingresoTotal - costoProduccionTotal
  const margenPorcentaje = ingresoTotal > 0
    ? Math.round((gananciaEstimada / ingresoTotal) * 100)
    : 0
  return { costoProduccionTotal, gananciaEstimada, margenPorcentaje }
}
