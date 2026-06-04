// =============================================
// cuentaCliente.js
// Cuenta corriente por cliente usando vistas DB
// y pagos_cliente con FIFO automático.
// =============================================

import { supabase } from './supabase'

/**
 * Resumen de todos los clientes con deuda usando la vista.
 * Devuelve un array con { cliente_id, cliente_nombre, pedidos_con_deuda, deuda_total... }
 */
export async function obtenerDeudoresResumen() {
  const { data, error } = await supabase
    .from('vista_deuda_pedidos')
    .select('*')
    .gt('deuda_restante', 0)
    .neq('estado', 'anulado')

  if (error) throw error

  // Agrupar y sumar manualmente para ignorar pedidos anulados
  const resumenMap = {}
  for (const row of (data || [])) {
    if (!resumenMap[row.cliente_id]) {
      resumenMap[row.cliente_id] = {
        cliente_id: row.cliente_id,
        cliente_nombre: row.cliente_nombre,
        pedidos_con_deuda: 0,
        total_vendido: 0,
        total_pagado: 0,
        deuda_total: 0
      }
    }
    const r = resumenMap[row.cliente_id]
    r.pedidos_con_deuda += 1
    r.total_vendido += row.total_pedido
    r.total_pagado += row.total_pagado
    r.deuda_total += row.deuda_restante
  }

  return Object.values(resumenMap).sort((a, b) => b.deuda_total - a.deuda_total)
}

/**
 * Obtiene los pedidos pendientes específicos de un cliente.
 */
export async function obtenerDeudaCliente(clienteId) {
  const { data, error } = await supabase
    .from('vista_deuda_pedidos')
    .select('*')
    .eq('cliente_id', clienteId)
    .gt('deuda_restante', 0)
    .neq('estado', 'anulado')
    .order('fecha_pedido', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Registra un pago de deuda distribuyendo el monto 
 * automáticamente a los pedidos más antiguos (FIFO).
 */
export async function registrarPagoDeuda({ cliente_id, monto_total, metodo_pago = 'efectivo', usuario = 'sistema' }) {
  if (monto_total <= 0) return { exito: false, mensaje: 'Monto inválido' }

  let montoRestante = Math.round(monto_total)

  // 1. Obtener pedidos con deuda ordenados del más antiguo al más nuevo
  const pedidosPendientes = await obtenerDeudaCliente(cliente_id)

  // 2. Aplicar FIFO insertando en pagos_cliente
  for (const p of pedidosPendientes) {
    if (montoRestante <= 0) break

    const abonarA_Este = Math.min(p.deuda_restante, montoRestante)
    if (abonarA_Este <= 0) continue

    const ef = metodo_pago === 'efectivo' ? abonarA_Este : 0
    const tr = metodo_pago === 'transferencia' ? abonarA_Este : 0

    // Insertar el pago específico para este pedido
    const { error: errPago } = await supabase
      .from('pagos_cliente')
      .insert({
        cliente_id: cliente_id,
        pedido_id: p.pedido_id,
        monto_efectivo: ef,
        monto_transferencia: tr,
        usuario: usuario,
        notas: 'Pago de deuda (FIFO)'
      })

    if (errPago) throw errPago

    montoRestante -= abonarA_Este
  }

  // Si queda monto sobrante y no hay más pedidos, idealmente debería haber validación previa 
  // para no permitir pagos mayores a la deuda total, lo cual haremos en el frontend.

  return { exito: true }
}

// Mantener estas funciones viejas como aliases si hay partes del código que aún no migran,
// o simplemente actualizaremos Deudas.jsx para que use las nuevas.
export const listarCuentasClientes = async () => {
  // Construir objeto similar a lo antiguo si hiciera falta, pero mejor actualizamos Deudas.jsx
  const resumen = await obtenerDeudoresResumen()
  
  // Para no romper la UI antes de que cambie, armamos algo parecido
  const resultado = []
  for (const r of resumen) {
    const pedidos = await obtenerDeudaCliente(r.cliente_id)
    resultado.push({
      id: r.cliente_id,
      nombre: r.cliente_nombre,
      saldo: r.deuda_total,
      movimientos: pedidos.map(p => ({
        id: p.pedido_id,
        tipo: 'cargo',
        monto_total: p.total_pedido,
        monto_abonado: p.total_pagado,
        pendiente: p.deuda_restante,
        fecha: p.fecha_pedido,
        descripcion: p.notas || 'Pedido'
      }))
    })
  }
  return resultado
}

export const registrarPagoCliente = async ({ clienteId, monto, metodo_pago, usuario }) => {
  return registrarPagoDeuda({
    cliente_id: clienteId,
    monto_total: monto,
    metodo_pago,
    usuario
  })
}
