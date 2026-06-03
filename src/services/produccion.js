// =============================================
// produccion.js
// Registro de cargas horneadas del día y cálculo
// del resumen de producción para el Dashboard.
// =============================================

import { supabase } from './supabase'
import { calcularCostoReceta } from './recetas'
import { obtenerLimitesDiaNegocio } from './helpers'

export async function registrarProduccion({ receta_id, cargas, notas }) {
  const { data, error } = await supabase
    .from('produccion')
    .insert({
      receta_id: Number(receta_id),
      cargas:    Number(cargas) || 1,
      notas:     notas || null,
    })
    .select('*, recetas ( id, nombre, panes_por_carga, precio_venta )')
    .single()
  if (error) throw error
  return data
}

export async function listarProduccionHoy() {
  const { inicio, fin } = obtenerLimitesDiaNegocio()
  const { data, error } = await supabase
    .from('produccion')
    .select(`
      *,
      recetas (
        id, nombre, panes_por_carga, precio_venta,
        receta_ingredientes (
          id, cantidad,
          insumos ( id, nombre, unidad, precio_compra, cantidad_compra )
        )
      )
    `)
    .gte('fecha', inicio.toISOString())
    .lte('fecha', fin.toISOString())
    .order('fecha', { ascending: false })
  if (error) throw error
  return data || []
}

export async function eliminarProduccion(id) {
  const { error } = await supabase.from('produccion').delete().eq('id', id)
  if (error) throw error
}

/**
 * Agrega todas las cargas del día y calcula el resumen financiero de producción.
 * Retorna: totalCargas, totalPanes, totalCosto, totalIngreso, ganancia, margen.
 */
/**
 * Calcula el stock disponible por receta comparando
 * lo producido hoy con lo vendido hoy.
 * Usa datos ya cargados en memoria (sin queries extra).
 */
export function calcularStockHoy(produccion, pedidos) {
  const stockPorReceta = {}

  // Sumar panes producidos por receta
  for (const p of produccion || []) {
    const receta = p.recetas
    if (!receta) continue
    if (!stockPorReceta[receta.id]) {
      stockPorReceta[receta.id] = {
        nombre:    receta.nombre,
        producidos: 0,
        vendidos:  0,
      }
    }
    stockPorReceta[receta.id].producidos += p.cargas * (receta.panes_por_carga || 0)
  }

  // Restar panes vendidos (items de pedidos no anulados cuyo producto tiene receta_id)
  for (const pedido of pedidos || []) {
    if (pedido.estado === 'anulado') continue
    for (const item of pedido.pedido_items || []) {
      const recetaId = item.productos?.receta_id
      if (recetaId && stockPorReceta[recetaId]) {
        // cantidad_panes indica cuántos panes físicos consume una unidad (ej: oferta = 7)
        const panesPorUnidad = item.productos?.cantidad_panes || 1
        stockPorReceta[recetaId].vendidos += (item.cantidad || 0) * panesPorUnidad
      }
    }
  }

  return Object.values(stockPorReceta).map(s => ({
    ...s,
    disponible: s.producidos - s.vendidos,
  }))
}

export function calcularResumenProduccion(produccion) {
  let totalCargas  = 0
  let totalPanes   = 0
  let totalCosto   = 0
  let totalIngreso = 0

  for (const p of produccion || []) {
    const receta = p.recetas
    if (!receta) continue
    const { costoCarga, ingresoCarga } = calcularCostoReceta(receta)
    totalCargas  += p.cargas
    totalPanes   += p.cargas * (receta.panes_por_carga || 0)
    totalCosto   += p.cargas * costoCarga
    totalIngreso += p.cargas * ingresoCarga
  }

  const ganancia = totalIngreso - totalCosto
  const margen   = totalIngreso > 0 ? Math.round((ganancia / totalIngreso) * 100) : 0
  return {
    totalCargas,
    totalPanes,
    totalCosto:   Math.round(totalCosto),
    totalIngreso: Math.round(totalIngreso),
    ganancia:     Math.round(ganancia),
    margen,
  }
}
