// =============================================
// EditarPedido.jsx
// Modal para editar un pedido existente.
// Usa el catálogo de productos con contadores.
// =============================================

import { useState, useEffect } from 'react'
import { X, Save, Loader2, User, ShoppingCart, DollarSign, FileText, Plus, Minus, Clock } from 'lucide-react'
import { editarPedido, listarProductos, formatearPesos } from '../services/supabaseClient'

const ESTADOS = [
  { value: 'pendiente', label: '⏳ Pendiente' },
  { value: 'listo',     label: '✅ Listo'     },
  { value: 'entregado', label: '📦 Entregado' },
]

function FilaProducto({ producto, cantidad, onChange }) {
  return (
    <div className={`flex items-center gap-2 py-2.5 px-3 rounded-xl border-2 transition-all ${
      cantidad > 0 ? 'border-orange-300 bg-orange-50' : 'border-gray-100 bg-white'
    }`}>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm truncate">{producto.nombre}</p>
        <p className="text-xs text-gray-400">{formatearPesos(producto.precio_venta)}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, cantidad - 1))}
          disabled={cantidad === 0}
          className="w-8 h-8 rounded-lg border-2 border-gray-200 bg-gray-50 flex items-center justify-center text-gray-500 active:scale-95 disabled:opacity-30"
        >
          <Minus size={12} />
        </button>
        <span className={`w-7 text-center font-bold text-base select-none ${cantidad > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
          {cantidad}
        </span>
        <button
          type="button"
          onClick={() => onChange(cantidad + 1)}
          className="w-8 h-8 rounded-lg border-2 border-orange-200 bg-orange-50 flex items-center justify-center font-bold text-orange-500 active:scale-95"
        >
          <Plus size={12} />
        </button>
      </div>
      {cantidad > 0 && (
        <p className="text-xs font-bold text-green-600 flex-shrink-0 w-14 text-right">
          {formatearPesos(cantidad * producto.precio_venta)}
        </p>
      )}
    </div>
  )
}

export default function EditarPedido({ pedido, onCerrar, onPedidoEditado, usuarioActual }) {
  const [productos, setProductos]   = useState([])
  const [cantidades, setCantidades] = useState({})
  const [nombreCliente, setNombre]  = useState(pedido.clientes?.nombre || '')
  const [estado, setEstado]               = useState(pedido.estado || 'pendiente')
  const [horaEntrega, setHoraEntrega] = useState(
    pedido.fecha_entrega ? new Date(pedido.fecha_entrega).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''
  )
  const [notas, setNotas]                 = useState(pedido.notas || '')
  const [guardando, setGuardando]   = useState(false)
  const [error, setError]           = useState(null)

  // Cargar catálogo de productos
  useEffect(() => {
    listarProductos().then(setProductos).catch(console.error)
  }, [])

  // Pre-poblar datos del pedido cuando se abre
  useEffect(() => {
    if (!pedido) return
    setNombre(pedido.clientes?.nombre || '')
    setEstado(pedido.estado || 'pendiente')
    setHoraEntrega(pedido.fecha_entrega ? new Date(pedido.fecha_entrega).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '')
    setNotas(pedido.notas || '')

    // Pre-fill cantidades desde pedido_items
    const cant = {}
    for (const item of pedido.pedido_items || []) {
      cant[item.producto_id] = item.cantidad
    }
    setCantidades(cant)
  }, [pedido])

  const setCantidad = (productoId, valor) =>
    setCantidades(prev => ({ ...prev, [productoId]: Math.max(0, valor) }))

  const items = productos
    .filter(p => (cantidades[p.id] || 0) > 0)
    .map(p => ({
      producto_id:     p.id,
      cantidad:        cantidades[p.id],
      precio_unitario: p.precio_venta,
    }))

  const totalMonto = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0)

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (guardando) return
    setGuardando(true)
    setError(null)
    try {
      let fecha_entrega = null
      if (horaEntrega) {
        const hoy = new Date()
        const [h, m] = horaEntrega.split(':')
        hoy.setHours(Number(h), Number(m), 0, 0)
        fecha_entrega = hoy.toISOString()
      }

      const pedidoActualizado = await editarPedido(pedido.id, {
        nombreCliente:  nombreCliente.trim(),
        items,
        estado,
        fecha_entrega,
        notas:          notas.trim() || null,
      }, usuarioActual?.nombre || 'sistema')
      onPedidoEditado?.(pedidoActualizado)
      onCerrar()
    } catch (err) {
      console.error('Error al editar pedido:', err)
      setError(err.message || 'Error al actualizar el pedido.')
    } finally {
      setGuardando(false)
    }
  }

  if (!pedido) return null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCerrar()}>
      <div className="modal-content">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Editar Pedido</h3>
            <p className="text-xs text-gray-400">ID #{pedido.id}</p>
          </div>
          <button onClick={onCerrar} className="btn-secondary !p-2 !rounded-full" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleGuardar} className="space-y-4">

          {/* Productos */}
          <div>
            <label className="input-label">
              <span className="flex items-center gap-1.5">
                <ShoppingCart size={14} className="text-orange-500" />
                Productos
              </span>
            </label>
            <div className="space-y-1.5">
              {productos.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">Cargando...</p>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const ofertas = productos.filter(p => p.nombre.toLowerCase().includes('oferta'))
                    const bebidas = productos.filter(p => p.nombre.toLowerCase().match(/té|cafe|café|consom/))
                    const sandwiches = productos.filter(p => p.nombre.toLowerCase().match(/ave|aliado|mantequilla|membrillo|churrasco/))
                    const basicos = productos.filter(p => !ofertas.includes(p) && !bebidas.includes(p) && !sandwiches.includes(p))

                    const Seccion = ({ titulo, items }) => {
                      if (items.length === 0) return null
                      return (
                        <div>
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-1">
                            {titulo}
                          </h3>
                          <div className="space-y-1.5">
                            {items.map(p => (
                              <FilaProducto
                                key={p.id}
                                producto={p}
                                cantidad={cantidades[p.id] || 0}
                                onChange={v => setCantidad(p.id, v)}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    }

                    return (
                      <>
                        <Seccion titulo="🍞 Pan y Sopaipillas" items={basicos} />
                        <Seccion titulo="🥪 Sándwiches" items={sandwiches} />
                        <Seccion titulo="☕ Bebidas y Sopas" items={bebidas} />
                        <Seccion titulo="🔥 Ofertas" items={ofertas} />
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Total */}
          {totalMonto > 0 && (
            <div className="flex items-center justify-between bg-orange-500 text-white rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-2">
                <DollarSign size={16} />
                <span className="font-semibold text-sm">Total</span>
              </div>
              <span className="text-lg font-bold">{formatearPesos(totalMonto)}</span>
            </div>
          )}

          {/* Nombre cliente */}
          <div>
            <label className="input-label">
              <span className="flex items-center gap-1.5">
                <User size={14} className="text-orange-500" />
                Cliente
              </span>
            </label>
            <input
              type="text"
              value={nombreCliente}
              onChange={e => setNombre(e.target.value)}
              className="input-field"
              maxLength={100}
              required
            />
          </div>

          {/* Estado */}
          <div>
            <label className="input-label">Estado del pedido</label>
            <div className="grid grid-cols-2 gap-2">
              {ESTADOS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEstado(value)}
                  className={`
                    py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all text-left
                    ${estado === value
                      ? 'border-orange-400 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>


          {/* Hora de entrega */}
          <div>
            <label className="input-label">
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-orange-500" />
                Hora de entrega <span className="font-normal text-gray-400">(opcional)</span>
              </span>
            </label>
            <input
              type="time"
              value={horaEntrega}
              onChange={e => setHoraEntrega(e.target.value)}
              className="input-field w-full"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { label: 'Ahora', value: '' },
                { label: '13:00', value: '13:00' },
                { label: '15:00', value: '15:00' },
                { label: '17:30', value: '17:30' },
                { label: '19:30', value: '19:30' }
              ].map(btn => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => setHoraEntrega(btn.value)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                    horaEntrega === btn.value
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="input-label">
              <span className="flex items-center gap-1.5">
                <FileText size={14} className="text-orange-500" />
                Notas <span className="font-normal text-gray-400">(opcional)</span>
              </span>
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              className="input-field resize-none"
              rows={2}
              maxLength={300}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCerrar} className="btn-secondary flex-1" disabled={guardando}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || !nombreCliente.trim()}
              className="btn-primary flex-1"
            >
              {guardando ? (
                <><Loader2 size={16} className="animate-spin" /> Guardando...</>
              ) : (
                <><Save size={16} /> Guardar</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
