// =============================================
// pedidos.js
// CRUD de pedidos, líneas de pedido (pedido_items),
// historial de cambios y suscripción real-time.
// =============================================

import { supabase } from './supabase'
import { obtenerLimitesDiaNegocio } from './helpers'

// ──────────────────────────────────────────
// CLIENTES (helper interno)
// ──────────────────────────────────────────

/** Busca un cliente por nombre; lo crea si no existe. */
export async function obtenerOCrearCliente(nombre, telefono = null) {
  const { data: existente, error: errBuscar } = await supabase
    .from('clientes')
    .select('*')
    .ilike('nombre', nombre.trim())
    .maybeSingle()

  if (errBuscar) throw errBuscar
  if (existente) return existente

  const { data: nuevo, error: errCrear } = await supabase
    .from('clientes')
    .insert({ nombre: nombre.trim(), telefono })
    .select()
    .single()

  if (errCrear) throw errCrear
  return nuevo
}

/** Lista todos los clientes ordenados por nombre alfabéticamente. */
export async function listarTodosClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre')
    .order('nombre')

  if (error) return []
  return data || []
}

/** Extrae los clientes únicos de los últimos pedidos (más frecuentes/recientes). */
export async function listarClientesFrecuentes(limite = 5) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('clientes ( id, nombre )')
    .order('fecha_pedido', { ascending: false })
    .limit(50)

  if (error) return []

  const unicos = []
  const ids = new Set()
  for (const row of (data || [])) {
    if (row.clientes && !ids.has(row.clientes.id)) {
      ids.add(row.clientes.id)
      unicos.push(row.clientes)
      if (unicos.length >= limite) break
    }
  }
  return unicos
}

// ──────────────────────────────────────────
// HISTORIAL
// ──────────────────────────────────────────

export async function registrarHistorial(pedidoId, accion, usuario = 'sistema') {
  const { error } = await supabase
    .from('historial')
    .insert({ pedido_id: pedidoId, accion, usuario })
  if (error) console.warn('Historial:', error.message)
}

// ──────────────────────────────────────────
// PEDIDOS
// ──────────────────────────────────────────

/** Crea un pedido con sus líneas de producto. */
export async function crearPedido({ nombreCliente, items = [], pagado, metodo_pago = 'efectivo', notas, usuario = 'sistema' }) {
  const cliente    = await obtenerOCrearCliente(nombreCliente)
  const montoPesos = Math.round(items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0))

  const { data, error } = await supabase
    .from('pedidos')
    .insert({
      cliente_id:           cliente.id,
      cantidad_panes:       0,
      cantidad_sopaipillas: 0,
      monto_pesos:          montoPesos,
      pagado:               pagado || false,
      metodo_pago:          pagado ? metodo_pago : null,
      estado:               'pendiente',
      notas:                notas || null,
      fecha_pedido:         new Date().toISOString(),
    })
    .select('*, clientes ( id, nombre, telefono )')
    .single()

  if (error) throw error

  if (items.length > 0) {
    const { error: errItems } = await supabase
      .from('pedido_items')
      .insert(items.map(i => ({
        pedido_id:       data.id,
        producto_id:     Number(i.producto_id),
        cantidad:        Number(i.cantidad),
        precio_unitario: Number(i.precio_unitario),
      })))
    if (errItems) console.warn('pedido_items insert:', errItems.message)
  }

  await registrarHistorial(data.id, 'Pedido creado', usuario)
  return data
}

/** Lista los pedidos de hoy con cliente e items.
 *  Si pedido_items no existe aún, cae al query básico.
 */
export async function listarPedidosHoy() {
  const { inicio, fin } = obtenerLimitesDiaNegocio()

  // Con join completo
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, clientes ( id, nombre, telefono ), pedido_items ( id, cantidad, precio_unitario, productos ( id, nombre, precio_venta ) )')
    .gte('fecha_pedido', inicio.toISOString())
    .lte('fecha_pedido', fin.toISOString())
    .order('fecha_pedido', { ascending: false })

  if (!error) return data || []

  // Fallback sin items (tabla no existe aún)
  console.warn('listarPedidosHoy: fallback sin items —', error.message)
  const { data: data2, error: error2 } = await supabase
    .from('pedidos')
    .select('*, clientes ( id, nombre, telefono )')
    .gte('fecha_pedido', inicio.toISOString())
    .lte('fecha_pedido', fin.toISOString())
    .order('fecha_pedido', { ascending: false })

  if (error2) throw error2
  return data2 || []
}

/** Avanza el estado de un pedido. */
export async function actualizarEstado(pedidoId, nuevoEstado, usuario = 'sistema') {
  const { data, error } = await supabase
    .from('pedidos')
    .update({ estado: nuevoEstado })
    .eq('id', pedidoId)
    .select('*, clientes ( id, nombre, telefono )')
    .single()

  if (error) throw error
  await registrarHistorial(pedidoId, `Estado: ${nuevoEstado}`, usuario)
  return data
}

/** Marca o desmarca el pago de un pedido. */
export async function actualizarPago(pedidoId, pagado, metodo_pago = 'efectivo', usuario = 'sistema') {
  // Auditoría: si lo marca como no pagado, revisar si antes estaba pagado
  let nuevasNotas = undefined
  if (!pagado) {
    const { data: original } = await supabase.from('pedidos').select('pagado, notas').eq('id', pedidoId).single()
    if (original && original.pagado) {
      nuevasNotas = `⚠️ [${usuario}] Cambió de PAGADO a DEUDA. ${(original.notas || '')}`.trim()
    }
  }

  const payload = { 
    pagado,
    metodo_pago: pagado ? metodo_pago : null
  }
  if (nuevasNotas !== undefined) {
    payload.notas = nuevasNotas
  }

  const { data, error } = await supabase
    .from('pedidos')
    .update(payload)
    .eq('id', pedidoId)
    .select('*, clientes ( id, nombre, telefono )')
    .single()

  if (error) throw error
  await registrarHistorial(pedidoId, pagado ? 'Marcado como pagado' : 'Pago revertido (anulado pago)', usuario)
  return data
}

/** Edita un pedido reemplazando sus líneas de producto. */
export async function editarPedido(pedidoId, { nombreCliente, items = [], pagado, metodo_pago = 'efectivo', notas, estado }, usuario = 'sistema') {
  const { data: original } = await supabase.from('pedidos').select('monto_pesos, pagado, notas, clientes(nombre)').eq('id', pedidoId).single()
  
  const cliente    = await obtenerOCrearCliente(nombreCliente)
  const montoPesos = Math.round(items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0))
  
  let notasFinales = notas || ''
  let alerta = ''
  
  if (original && original.monto_pesos > montoPesos) {
    alerta += `⚠️ [${usuario}] Bajó monto de $${original.monto_pesos} a $${montoPesos}. `
  }
  
  if (original && original.pagado === true && pagado === false) {
    alerta += `⚠️ [${usuario}] Cambió de PAGADO a DEUDA. `
  }

  if (original && original.clientes && original.clientes.nombre !== nombreCliente.trim()) {
    alerta += `⚠️ [${usuario}] Cambió cliente de "${original.clientes.nombre}" a "${nombreCliente.trim()}". `
  }
  
  if (alerta) {
    notasFinales = (alerta + '\n' + (original.notas || '') + '\n' + notasFinales).trim()
  }

  const { data, error } = await supabase
    .from('pedidos')
    .update({
      cliente_id:  cliente.id,
      monto_pesos: montoPesos,
      pagado:      pagado || false,
      metodo_pago: pagado ? metodo_pago : null,
      estado:      estado || 'pendiente',
      notas:       notasFinales || null,
    })
    .eq('id', pedidoId)
    .select('*, clientes ( id, nombre, telefono )')
    .single()

  if (error) throw error

  // Reemplazar líneas de producto
  await supabase.from('pedido_items').delete().eq('pedido_id', pedidoId)
  if (items.length > 0) {
    const { error: errItems } = await supabase
      .from('pedido_items')
      .insert(items.map(i => ({
        pedido_id:       pedidoId,
        producto_id:     Number(i.producto_id),
        cantidad:        Number(i.cantidad),
        precio_unitario: Number(i.precio_unitario),
      })))
    if (errItems) console.warn('pedido_items edit:', errItems.message)
  }

  await registrarHistorial(pedidoId, alerta ? 'Edición sospechosa' : 'Pedido editado', usuario)
  return { ...data, pedido_items: items }
}

/** Anula un pedido (Soft delete). No se borra para auditoría. */
export async function anularPedido(pedidoId, usuario = 'sistema') {
  const { data, error } = await supabase
    .from('pedidos')
    .update({ estado: 'anulado' })
    .eq('id', pedidoId)
    .select('*, clientes ( id, nombre, telefono )')
    .single()
    
  if (error) throw error
  await registrarHistorial(pedidoId, 'Pedido ANULADO', usuario)
  return data
}

// ──────────────────────────────────────────
// REAL-TIME
// ──────────────────────────────────────────

/** Suscribe a cambios en la tabla pedidos. Retorna función de cancelación. */
export function suscribirPedidos(callback) {
  const channel = supabase
    .channel('pedidos-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, callback)
    .subscribe((status, error) => {
      if (error) {
        console.error('Error suscribiendo a pedidos:', error.message)
        return () => {}
      }
    })

  return () => { supabase.removeChannel(channel) }
}

// ──────────────────────────────────────────
// DEUDAS (FIADOS)
// ──────────────────────────────────────────

/** Lista todos los pedidos pendientes de pago (histórico). */
export async function listarDeudas() {
  const hace90dias = new Date()
  hace90dias.setDate(hace90dias.getDate() - 90)

  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      *,
      clientes ( id, nombre, telefono ),
      pedido_items (
        cantidad,
        precio_unitario,
        productos ( nombre )
      )
    `)
    .eq('pagado', false)
    .neq('estado', 'anulado')
    .gte('fecha_pedido', hace90dias.toISOString())
    .order('fecha_pedido', { ascending: false })
    .limit(200)

  if (error) {
    console.error('Error listando deudas:', error)
    return []
  }
  return data
}

/** Trae un pedido individual con todos sus joins (usado por real-time). */
export async function obtenerPedidoConDetalle(pedidoId) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, clientes ( id, nombre, telefono ), pedido_items ( id, cantidad, precio_unitario, productos ( id, nombre, precio_venta ) )')
    .eq('id', pedidoId)
    .single()
  if (error) throw error
  return data
}

/** Marca múltiples pedidos como pagados. */
export async function cobrarPedidos(ids, metodo_pago = 'efectivo') {
  if (!ids || ids.length === 0) return
  
  const { error } = await supabase
    .from('pedidos')
    .update({ pagado: true, metodo_pago })
    .in('id', ids)

  if (error) throw error
}
