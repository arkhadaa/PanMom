// =============================================
// pedidos.js
// CRUD de pedidos, líneas de pedido (pedido_items),
// historial de cambios y suscripción real-time.
// =============================================

import { supabase } from './supabase'

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
export async function crearPedido({ nombreCliente, items = [], pagado, notas }) {
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

  await registrarHistorial(data.id, 'Pedido creado', 'sistema')
  return data
}

/** Lista los pedidos de hoy con cliente e items.
 *  Si pedido_items no existe aún, cae al query básico.
 */
export async function listarPedidosHoy() {
  const hoy    = new Date()
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0)
  const fin    = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59)

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
export async function actualizarEstado(pedidoId, nuevoEstado) {
  const { data, error } = await supabase
    .from('pedidos')
    .update({ estado: nuevoEstado })
    .eq('id', pedidoId)
    .select('*, clientes ( id, nombre, telefono )')
    .single()

  if (error) throw error
  await registrarHistorial(pedidoId, `Estado: ${nuevoEstado}`, 'sistema')
  return data
}

/** Marca o desmarca el pago de un pedido. */
export async function actualizarPago(pedidoId, pagado) {
  const { data, error } = await supabase
    .from('pedidos')
    .update({ pagado })
    .eq('id', pedidoId)
    .select('*, clientes ( id, nombre, telefono )')
    .single()

  if (error) throw error
  await registrarHistorial(pedidoId, pagado ? 'Pago recibido' : 'Pago revertido', 'sistema')
  return data
}

/** Edita un pedido reemplazando sus líneas de producto. */
export async function editarPedido(pedidoId, { nombreCliente, items = [], pagado, notas, estado }) {
  const cliente    = await obtenerOCrearCliente(nombreCliente)
  const montoPesos = Math.round(items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0))

  const { data, error } = await supabase
    .from('pedidos')
    .update({
      cliente_id:  cliente.id,
      monto_pesos: montoPesos,
      pagado:      pagado || false,
      estado:      estado || 'pendiente',
      notas:       notas || null,
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

  await registrarHistorial(pedidoId, 'Pedido editado', 'sistema')
  return { ...data, pedido_items: items }
}

/** Elimina un pedido y su historial. */
export async function eliminarPedido(pedidoId) {
  await supabase.from('historial').delete().eq('pedido_id', pedidoId)
  const { error } = await supabase.from('pedidos').delete().eq('id', pedidoId)
  if (error) throw error
  return true
}

// ──────────────────────────────────────────
// REAL-TIME
// ──────────────────────────────────────────

/** Suscribe a cambios en la tabla pedidos. Retorna función de cancelación. */
export function suscribirPedidos(callback) {
  const channel = supabase
    .channel('pedidos-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, callback)
    .subscribe()
  return () => supabase.removeChannel(channel)
}
