// =============================================
// AgregarPedido.jsx
// Formulario multi-producto: catálogo de productos
// con contador de cantidad por ítem.
// =============================================

import { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, Minus, User, ShoppingCart, DollarSign, FileText, CheckCircle, Loader2 } from 'lucide-react'
import { 
  crearPedido, listarProductos, formatearPesos, 
  listarTodosClientes, listarClientesFrecuentes 
} from '../services/supabaseClient'

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ value, onChange, labelOn, labelOff }) {
  return (
    <div
      className="toggle-container"
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      tabIndex={0}
      onKeyDown={e => e.key === ' ' && onChange(!value)}
    >
      <div className={`toggle-track ${value ? 'on' : 'off'}`}>
        <div className={`toggle-thumb ${value ? 'on' : 'off'}`} />
      </div>
      <span className={`text-sm font-semibold ${value ? 'text-green-600' : 'text-gray-500'}`}>
        {value ? labelOn : labelOff}
      </span>
    </div>
  )
}

// ─── Fila de producto ─────────────────────────────────────────────────────────
function FilaProducto({ producto, cantidad, onChange }) {
  const inc = () => onChange(cantidad + 1)
  const dec = () => onChange(Math.max(0, cantidad - 1))
  const subtotal = cantidad * producto.precio_venta

  return (
    <div className={`flex items-center gap-3 py-3 px-4 rounded-xl border-2 transition-all ${
      cantidad > 0 ? 'border-orange-300 bg-orange-50' : 'border-gray-100 bg-white'
    }`}>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm truncate">{producto.nombre}</p>
        <p className="text-xs text-gray-400">{formatearPesos(producto.precio_venta)} c/u</p>
      </div>

      {/* Contador */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={dec}
          disabled={cantidad === 0}
          className="w-9 h-9 rounded-xl border-2 border-gray-200 bg-gray-50 flex items-center justify-center text-gray-500 active:scale-95 transition-all disabled:opacity-30"
        >
          <Minus size={14} />
        </button>
        <span className={`w-8 text-center font-bold text-lg select-none ${cantidad > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
          {cantidad}
        </span>
        <button
          type="button"
          onClick={inc}
          className="w-9 h-9 rounded-xl border-2 border-orange-200 bg-orange-50 flex items-center justify-center font-bold text-orange-500 active:scale-95 transition-all"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Subtotal */}
      {cantidad > 0 && (
        <div className="flex-shrink-0 min-w-[56px] text-right">
          <p className="text-sm font-bold text-green-600">{formatearPesos(subtotal)}</p>
        </div>
      )}
    </div>
  )
}

// ─── Formulario principal ─────────────────────────────────────────────────────
export default function AgregarPedido({ onPedidoCreado, onIrAPedidos }) {
  const [productos, setProductos]   = useState([])
  const [cantidades, setCantidades] = useState({}) // { producto_id: cantidad }
  const [nombreCliente, setNombre]  = useState('')
  const [pagado, setPagado]         = useState(false)
  const [notas, setNotas]           = useState('')
  const [guardando, setGuardando]   = useState(false)
  const [exito, setExito]           = useState(false)
  const [error, setError]           = useState(null)
  const [cargandoProd, setCargProd] = useState(true)

  // Estados para autocompletado y clientes frecuentes
  const [clientesTodos, setClientesTodos] = useState([])
  const [clientesFrecuentes, setClientesFrecuentes] = useState([])
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  
  // Referencia para ocultar el autocomplete al hacer click fuera
  const clienteContainerRef = useRef(null)

  useEffect(() => {
    Promise.all([
      listarProductos().catch(() => []),
      listarTodosClientes().catch(() => []),
      listarClientesFrecuentes(5).catch(() => [])
    ]).then(([prodData, todosData, frecData]) => {
      setProductos(prodData)
      setClientesTodos(todosData)
      setClientesFrecuentes(frecData)
      setCargProd(false)
    })
  }, [])

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (clienteContainerRef.current && !clienteContainerRef.current.contains(event.target)) {
        setMostrarSugerencias(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Filtrado de sugerencias de clientes
  const clientesSugeridos = useMemo(() => {
    const search = nombreCliente.trim().toLowerCase()
    if (!search) return []
    return clientesTodos
      .filter(c => c.nombre.toLowerCase().includes(search) && c.nombre.toLowerCase() !== search)
      .slice(0, 5) // Mostramos hasta 5 sugerencias para no ensuciar la UI
  }, [nombreCliente, clientesTodos])

  const setCantidad = (productoId, valor) =>
    setCantidades(prev => ({ ...prev, [productoId]: Math.max(0, valor) }))

  const items = useMemo(() =>
    productos
      .filter(p => (cantidades[p.id] || 0) > 0)
      .map(p => ({
        producto_id:     p.id,
        cantidad:        cantidades[p.id],
        precio_unitario: p.precio_venta,
      })),
  [productos, cantidades])

  const totalMonto = useMemo(() =>
    items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0),
  [items])

  const esValido = nombreCliente.trim().length >= 2 && items.length > 0

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!esValido || guardando) return
    setGuardando(true)
    setError(null)
    try {
      await crearPedido({
        nombreCliente: nombreCliente.trim(),
        items,
        pagado,
        notas: notas.trim() || null,
      })
      setExito(true)
      setNombre('')
      setCantidades({})
      setPagado(false)
      setNotas('')
      onPedidoCreado?.()
      setTimeout(() => setExito(false), 2500)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Error al guardar el pedido.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="p-4 safe-bottom max-w-lg mx-auto">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-800">Nuevo Pedido</h2>
        <p className="text-sm text-gray-500">Selecciona productos y cliente</p>
      </div>

      {exito && (
        <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 animate-fade-up">
          <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800 text-sm">¡Pedido guardado!</p>
            <p className="text-xs text-green-600">Se actualizó en tiempo real.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-red-800">Error al guardar</p>
          <p className="text-xs text-red-600 mt-0.5">{error}</p>
        </div>
      )}

      <form onSubmit={handleGuardar} className="space-y-4">

        {/* ── Productos ── */}
        <div>
          <div className="divider-text flex items-center gap-1.5 mb-3">
            <ShoppingCart size={12} className="text-orange-400" />
            Productos
          </div>

          {cargandoProd ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="skeleton h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : productos.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
              Sin productos — ejecuta el SQL de productos.
            </div>
          ) : (
            <div className="space-y-2">
              {productos.map(p => (
                <FilaProducto
                  key={p.id}
                  producto={p}
                  cantidad={cantidades[p.id] || 0}
                  onChange={v => setCantidad(p.id, v)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Total ── */}
        {totalMonto > 0 && (
          <div className="flex items-center justify-between bg-orange-500 text-white rounded-xl px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <DollarSign size={18} />
              <span className="font-semibold">
                Total · {items.reduce((s, i) => s + i.cantidad, 0)} ítem{items.reduce((s, i) => s + i.cantidad, 0) !== 1 ? 's' : ''}
              </span>
            </div>
            <span className="text-xl font-bold">{formatearPesos(totalMonto)}</span>
          </div>
        )}

        {/* ── Cliente ── */}
        <div className="divider-text mt-4">Cliente</div>
        <div ref={clienteContainerRef} className="relative">
          <label className="input-label mb-2">
            <span className="flex items-center gap-1.5">
              <User size={14} className="text-orange-500" />
              Nombre del cliente
            </span>
          </label>
          
          {/* Chips de clientes frecuentes */}
          {clientesFrecuentes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {clientesFrecuentes.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setNombre(c.nombre)
                    setMostrarSugerencias(false)
                  }}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95
                    ${nombreCliente === c.nombre
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                    }
                  `}
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          )}

          {/* Input de texto con autocomplete */}
          <input
            type="text"
            value={nombreCliente}
            onChange={e => {
              setNombre(e.target.value)
              setMostrarSugerencias(true)
            }}
            onFocus={() => setMostrarSugerencias(true)}
            placeholder="Escribe el nombre..."
            className="input-field w-full"
            autoComplete="off"
            maxLength={100}
            required
          />

          {/* Dropdown de sugerencias */}
          {mostrarSugerencias && clientesSugeridos.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden animate-slide-in">
              {clientesSugeridos.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setNombre(c.nombre)
                    setMostrarSugerencias(false)
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-orange-50 active:bg-orange-100 border-b border-gray-50 last:border-0 transition-colors"
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Pago ── */}
        <div className="card !py-3 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-700 text-sm">Estado de pago</p>
            <p className="text-xs text-gray-400">¿El cliente ya pagó?</p>
          </div>
          <Toggle value={pagado} onChange={setPagado} labelOn="✓ Pagó" labelOff="Debe" />
        </div>

        {/* ── Notas ── */}
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
            placeholder="Ej: Sin sal, para las 15:00"
            className="input-field resize-none"
            rows={2}
            maxLength={300}
          />
        </div>

        <button
          type="submit"
          disabled={!esValido || guardando}
          className="btn-primary w-full !py-4 text-base mt-2"
        >
          {guardando
            ? <><Loader2 size={18} className="animate-spin" /> Guardando...</>
            : <><Plus size={18} /> Guardar Pedido</>
          }
        </button>

        {exito && (
          <button type="button" onClick={onIrAPedidos} className="btn-secondary w-full">
            Ver todos los pedidos →
          </button>
        )}
      </form>
    </div>
  )
}
