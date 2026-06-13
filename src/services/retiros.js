// =============================================
// retiros.js
// Retiros de caja del día (plata que saca el dueño)
// y cálculo del estado de caja.
// =============================================

import { supabase } from './supabase'
import { obtenerLimitesDiaNegocio } from './helpers'

/** Lista los retiros del día actual. */
export async function listarRetirosHoy() {
  const { inicio, fin } = obtenerLimitesDiaNegocio()
  const { data, error } = await supabase
    .from('retiros')
    .select('*')
    .gte('fecha', inicio.toISOString())
    .lte('fecha', fin.toISOString())
    .order('fecha', { ascending: false })
  if (error) throw error
  return data || []
}

/** Registra un retiro de caja o movimiento histórico. */
export async function registrarRetiro({ monto, descripcion, usuario, metodo_pago, origen, fecha_operacion }) {
  const insertData = {
    monto:           Number(monto) || 0,
    descripcion:     descripcion?.trim() || null,
    usuario:         usuario || 'sistema',
    metodo_pago:     metodo_pago || 'efectivo',
    origen:          origen?.trim() || 'retiro',
    fecha_operacion: fecha_operacion ? new Date(fecha_operacion).toISOString() : new Date().toISOString(),
    fecha:           fecha_operacion ? new Date(fecha_operacion).toISOString() : new Date().toISOString(), // retrocompatibilidad
  }

  const { data, error } = await supabase
    .from('retiros')
    .insert(insertData)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Elimina un retiro por ID. */
export async function eliminarRetiro(id) {
  const { error } = await supabase.from('retiros').delete().eq('id', id)
  if (error) throw error
}

/**
 * Calcula el estado de caja del día.
 * Caja Física = Cobrado Efectivo (ventas) + Cobros Deuda Efectivo − Gastos − Retiros
 * pagosDeudas: filas de pagos_cliente de hoy
 */
export function calcularCajaHoy(pedidos, gastos, retiros, pagosDeudas = []) {
  const pedidosPagados = (pedidos || []).filter(p => p.pagado && p.estado !== 'anulado')

  let cobradoEfectivo = 0
  let cobradoTransferencia = 0
  for (const p of pedidosPagados) {
    if (p.metodo_pago === 'saldado') {
      // Ya se contó a través de pagosDeudas (cobrosFiados), evitamos conteo doble
      continue
    }
    if (p.metodo_pago === 'mixto') {
      cobradoEfectivo     += p.monto_efectivo || 0
      cobradoTransferencia += (p.monto_pesos || 0) - (p.monto_efectivo || 0)
    } else if (p.metodo_pago === 'transferencia') {
      cobradoTransferencia += p.monto_pesos || 0
    } else {
      cobradoEfectivo += p.monto_pesos || 0
    }
  }

  // Cobros de deudas viejas recibidos hoy — entran a la caja pero NO son venta del día
  const cobrosDeudaEfectivo = (pagosDeudas || [])
    .filter(p => !p.metodo_pago || p.metodo_pago === 'efectivo')
    .reduce((s, p) => s + (p.monto || 0), 0)

  const cobrosDeudaTransferencia = (pagosDeudas || [])
    .filter(p => p.metodo_pago === 'transferencia')
    .reduce((s, p) => s + (p.monto || 0), 0)

  const totalGastos  = (gastos  || []).reduce((s, g) => s + (g.monto || 0), 0)
  const totalRetiros = (retiros || []).reduce((s, r) => s + (r.monto || 0), 0)

  // Caja física: solo efectivo (transferencias no están en el cajón)
  const caja = cobradoEfectivo + cobrosDeudaEfectivo - totalGastos - totalRetiros

  return {
    cobrado:                cobradoEfectivo + cobradoTransferencia,
    cobradoEfectivo,
    cobradoTransferencia,
    cobrosDeudaEfectivo,
    cobrosDeudaTransferencia,
    totalCobrosDeuda:       cobrosDeudaEfectivo + cobrosDeudaTransferencia,
    totalGastos,
    totalRetiros,
    caja,
  }
}
