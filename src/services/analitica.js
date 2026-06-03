// =============================================
// analitica.js
// Servicio dedicado a consultas complejas para
// el panel de Finanzas (semanal, mensual, etc.)
// =============================================

import { supabase } from './supabase'

/**
 * Obtiene el inicio y fin de la semana actual (Lunes a Domingo)
 * ajustado al horario de negocio (5 AM).
 */
export function obtenerLimitesSemanaActual() {
  const ahora = new Date()
  
  // Ajuste de "día de negocio": si es antes de las 5 AM, pertenece al día anterior
  if (ahora.getHours() < 5) {
    ahora.setDate(ahora.getDate() - 1)
  }

  // Obtener día de la semana (0: Domingo, 1: Lunes, ..., 6: Sábado)
  const diaSemana = ahora.getDay()
  const diasParaLunes = diaSemana === 0 ? 6 : diaSemana - 1

  // Fecha de inicio de la semana (Lunes a las 05:00:00)
  const inicioSemana = new Date(ahora)
  inicioSemana.setDate(inicioSemana.getDate() - diasParaLunes)
  inicioSemana.setHours(5, 0, 0, 0)

  // Fecha de fin de la semana (Domingo siguiente a las 04:59:59)
  const finSemana = new Date(inicioSemana)
  finSemana.setDate(finSemana.getDate() + 7)
  finSemana.setMilliseconds(-1)

  return { inicio: inicioSemana, fin: finSemana }
}

/**
 * Obtiene el inicio y fin del mes actual
 * ajustado al horario de negocio (5 AM).
 */
export function obtenerLimitesMesActual() {
  const ahora = new Date()
  if (ahora.getHours() < 5) ahora.setDate(ahora.getDate() - 1)

  // Primer día del mes a las 05:00:00
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  inicioMes.setHours(5, 0, 0, 0)

  // Primer día del mes SIGUIENTE a las 04:59:59
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1)
  finMes.setHours(5, 0, 0, 0)
  finMes.setMilliseconds(-1)

  return { inicio: inicioMes, fin: finMes }
}

/**
 * Obtiene el flujo de caja estricto de la semana en curso.
 */
export async function obtenerFlujoSemanal() {
  const { inicio, fin } = obtenerLimitesSemanaActual()
  
  // 1. Pedidos
  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('monto_pesos, estado')
    .gte('fecha_pedido', inicio.toISOString())
    .lte('fecha_pedido', fin.toISOString())

  // 2. Gastos
  const { data: gastos } = await supabase
    .from('gastos')
    .select('monto')
    .gte('fecha_gasto', inicio.toISOString())
    .lte('fecha_gasto', fin.toISOString())

  // 3. Retiros
  const { data: retiros } = await supabase
    .from('retiros')
    .select('monto')
    .gte('fecha', inicio.toISOString())
    .lte('fecha', fin.toISOString())

  // 4. Pagos de clientes (todo ingreso de dinero ahora entra por aquí)
  const { data: pagos } = await supabase
    .from('pagos_cliente')
    .select('monto_efectivo, monto_transferencia')
    .gte('fecha', inicio.toISOString())
    .lte('fecha', fin.toISOString())

  // Cálculos
  const validPedidos = (pedidos || []).filter(p => p.estado !== 'anulado')
  const ventas = validPedidos.reduce((s, p) => s + (p.monto_pesos || 0), 0)
  
  // Ingresos reales = todos los pagos registrados en pagos_cliente en la semana
  const totalIngresos = (pagos || []).reduce((s, p) => s + (p.monto_efectivo || 0) + (p.monto_transferencia || 0), 0)

  const totalGastos = (gastos || []).reduce((s, g) => s + (g.monto || 0), 0)
  const totalRetiros = (retiros || []).reduce((s, r) => s + (r.monto || 0), 0)

  const disponibleSemana = totalIngresos - totalGastos - totalRetiros

  return {
    ventas,
    ingresos: totalIngresos,
    gastos: totalGastos,
    retiros: totalRetiros,
    disponible: disponibleSemana
  }
}

/**
 * Obtiene el total de retiros agrupados por persona (usuario) en el mes actual.
 * Retorna también la lista de los últimos 5 retiros para auditoría.
 */
export async function obtenerRetirosMensuales() {
  const { inicio, fin } = obtenerLimitesMesActual()
  
  const { data: retiros } = await supabase
    .from('retiros')
    .select('*')
    .gte('fecha', inicio.toISOString())
    .lte('fecha', fin.toISOString())
    .order('fecha', { ascending: false })

  const agrupados = {}
  let totalMensual = 0

  for (const r of retiros || []) {
    const usr = r.usuario || 'Desconocido'
    agrupados[usr] = (agrupados[usr] || 0) + (r.monto || 0)
    totalMensual += (r.monto || 0)
  }

  const resumen = Object.keys(agrupados).map(u => ({
    usuario: u,
    total: agrupados[u]
  })).sort((a, b) => b.total - a.total)

  return {
    resumen,
    totalMensual,
    ultimos: (retiros || []).slice(0, 10) // Últimos 10 retiros para el listado rápido
  }
}
