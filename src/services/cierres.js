// =============================================
// cierres.js
// Lógica para registrar y listar los cierres de caja
// usando el nuevo esquema y vista_caja_hoy.
// =============================================

import { supabase } from './supabase'
import { obtenerLimitesDiaNegocio } from './helpers'

/**
 * Obtiene los totales de la caja del día usando límites locales 
 * para evitar bugs de zona horaria con CURRENT_DATE de Postgres.
 */
export async function obtenerCajaHoy() {
  const { inicio, fin } = obtenerLimitesDiaNegocio()
  const isoInicio = inicio.toISOString()
  const isoFin = fin.toISOString()
  
  // Extraemos la fecha local (YYYY-MM-DD) usando un offset simple o el formato del string.
  // Como `inicio` ya es la fecha de inicio del negocio local (ej. 4 AM), 
  // su getFullYear, getMonth, getDate corresponden a la fecha correcta.
  const fechaLocalStr = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-${String(inicio.getDate()).padStart(2, '0')}`

  try {
    const [pagosRes, gastosRes, retirosRes, aperturaRes] = await Promise.all([
      supabase.from('pagos_cliente').select('monto_efectivo, monto_transferencia, pedidos(fecha_pedido)').gte('fecha', isoInicio).lte('fecha', isoFin),
      supabase.from('gastos').select('monto').gte('fecha_gasto', isoInicio).lte('fecha_gasto', isoFin),
      supabase.from('retiros').select('monto').gte('fecha', isoInicio).lte('fecha', isoFin),
      supabase.from('aperturas_caja').select('monto').eq('fecha', fechaLocalStr).maybeSingle()
    ])

    let ingresos_efectivo = 0
    let ingresos_transferencia = 0
    let cobros_atrasados = 0

    ;(pagosRes.data || []).forEach(p => {
      ingresos_efectivo += (p.monto_efectivo || 0)
      ingresos_transferencia += (p.monto_transferencia || 0)
      
      const fechaPedido = p.pedidos?.fecha_pedido
      if (fechaPedido && new Date(fechaPedido).getTime() < inicio.getTime()) {
        cobros_atrasados += (p.monto_efectivo || 0) + (p.monto_transferencia || 0)
      }
    })

    const total_gastos = (gastosRes.data || []).reduce((s, g) => s + (g.monto || 0), 0)
    const total_retiros = (retirosRes.data || []).reduce((s, r) => s + (r.monto || 0), 0)
    const monto_apertura = aperturaRes.data?.monto || 0
    const apertura_registrada = !!aperturaRes.data

    const caja_efectivo_final = monto_apertura + ingresos_efectivo - total_gastos - total_retiros

    return {
      monto_apertura,
      apertura_registrada,
      ingresos_efectivo,
      ingresos_transferencia,
      cobros_atrasados,
      total_gastos,
      total_retiros,
      caja_efectivo_final
    }
  } catch (err) {
    console.error("Error obteniendo caja hoy:", err)
    return { monto_apertura: 0, apertura_registrada: false, ingresos_efectivo: 0, ingresos_transferencia: 0, total_gastos: 0, total_retiros: 0, caja_efectivo_final: 0 }
  }
}

/**
 * Registra o actualiza la apertura de caja para el día de hoy.
 */
export async function registrarApertura(monto, usuario = 'sistema') {
  const { inicio } = obtenerLimitesDiaNegocio()
  const fechaLocalStr = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}-${String(inicio.getDate()).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('aperturas_caja')
    .upsert([{ fecha: fechaLocalStr, monto, usuario }])
    .select()

  if (error) throw error
  return data
}

export async function registrarCierreCaja(datos) {
  // datos espera: 
  // total_ingresos_efectivo, total_ingresos_transferencia, total_gastos, total_retiros, total_ventas, total_deuda_generada
  const { data, error } = await supabase
    .from('cierres_caja')
    .insert([datos])
    .select()

  if (error) {
    console.error('Error registrando cierre:', error)
    throw error
  }
  return data
}

export async function listarCierresCaja() {
  const { data, error } = await supabase
    .from('cierres_caja')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(30)

  if (error) {
    console.error('Error listando cierres:', error)
    return []
  }
  return data
}
