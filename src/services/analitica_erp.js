// =============================================
// analitica_erp.js
// Lógica para el Dashboard Super Admin (V Final)
// =============================================

import { supabase } from './supabase'

/**
 * Obtiene el Libro Mayor (Movimientos unificados)
 */
export async function obtenerLibroMayor(limit = 100) {
  const { data, error } = await supabase
    .from('vista_movimientos')
    .select('*')
    .order('fecha_movimiento', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

/**
 * Calcula el Capital Actual (Caja Física y Banco).
 * Usa el último cierre de caja como base (saldo inicial) y suma 
 * únicamente los movimientos que ocurrieron en fechas posteriores.
 * Esto evita el desajuste si faltan ventas históricas chiquitas en la BD.
 */
export async function obtenerCapitalActual() {
  // 1. Obtener el último cierre
  const { data: ultimoCierre } = await supabase
    .from('cierres_caja')
    .select('fecha, caja, banco')
    .order('fecha', { ascending: false })
    .limit(1)
    .single()

  let caja = 0
  let banco = 0
  let fechaFiltro = '2000-01-01'

  if (ultimoCierre) {
    caja = Number(ultimoCierre.caja || 0)
    banco = Number(ultimoCierre.banco || 0)
    // Usar la fecha del cierre tal cual (YYYY-MM-DD) para el filtro gt (mayor a)
    fechaFiltro = ultimoCierre.fecha.split('T')[0]
  }

  // 2. Traer movimientos posteriores a la fechaFiltro
  const { data: pagos } = await supabase
    .from('pagos_cliente')
    .select('monto_efectivo, monto_transferencia, fecha')
    .gt('fecha', fechaFiltro)
  
  const { data: gastos } = await supabase
    .from('gastos')
    .select('monto, metodo_pago, fecha_gasto')
    .gt('fecha_gasto', fechaFiltro)

  const { data: retiros } = await supabase
    .from('retiros')
    .select('monto, metodo_pago, fecha')
    .gt('fecha', fechaFiltro)

  console.log("DEBUG CAPITAL:", { ultimoCierre, fechaFiltro, pagos, gastos, retiros })

  // 3. Sumar ingresos nuevos
  for (const p of (pagos || [])) {
    caja += Number(p.monto_efectivo || 0)
    banco += Number(p.monto_transferencia || 0)
  }

  // 4. Restar gastos nuevos
  for (const g of (gastos || [])) {
    if (g.metodo_pago === 'transferencia') banco -= Number(g.monto || 0)
    else caja -= Number(g.monto || 0)
  }

  // 5. Restar retiros nuevos
  for (const r of (retiros || [])) {
    if (r.metodo_pago === 'transferencia') banco -= Number(r.monto || 0)
    else caja -= Number(r.monto || 0)
  }

  return {
    caja,
    banco,
    total: caja + banco
  }
}

/**
 * Calcula la evolución semanal del capital neto.
 * Trae los cierres de caja de los últimos 7 días.
 * Si un día no tiene cierre, el frontend puede auto-calcularlo, 
 * pero por ahora devolveremos los puntos de datos existentes.
 */
export async function obtenerEvolucionSemanal() {
  const hace7Dias = new Date()
  hace7Dias.setDate(hace7Dias.getDate() - 7)

  const { data, error } = await supabase
    .from('cierres_caja')
    .select('fecha, caja, banco')
    .gte('fecha', hace7Dias.toISOString())
    .order('fecha', { ascending: true })

  if (error) throw error
  
  // Formatear para recharts
  return (data || []).map(d => ({
    fecha: d.fecha ? d.fecha.split('T')[0] : '',
    caja: Number(d.caja || 0),
    banco: Number(d.banco || 0),
    total: Number(d.caja || 0) + Number(d.banco || 0)
  }))
}

/**
 * Registra un cierre de caja con los valores calculados EXACTOS
 * de este instante.
 */
export async function registrarCierreDiario(caja, banco) {
  const hoyStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  
    // Evitar duplicados borrando el registro de hoy si ya existía uno
    await supabase.from('cierres_caja').delete().eq('fecha', hoyStr);

    const { data, error } = await supabase
      .from('cierres_caja')
      .insert({
        fecha: hoyStr,
        caja: Number(caja),
        banco: Number(banco)
      })
      .select()
      .single()

  if (error) throw error
  return data
}
