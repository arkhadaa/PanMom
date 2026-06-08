// =============================================
// AgregarPedido.jsx
// Formulario multi-producto: catálogo de productos
// con contador de cantidad por ítem.
// =============================================

import { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, Minus, User, ShoppingCart, DollarSign, FileText, CheckCircle, Loader2, Clock } from 'lucide-react'

import { 
  crearPedido, listarProductos, formatearPesos, 
  listarTodosClientes, listarClientesFrecuentes, calcularStockHoy
} from '../services/supabaseClient'
import { useSyncQueue } from '../hooks/useSyncQueue'

// ─── Tarjeta de producto (Grid) ───────────────────────────────────────────────
function TarjetaProducto({ producto, cantidad, onChange, colorTheme, stockDisponible, tieneReceta, hayProduccionHoy, autoFocus }) {
  const inputRef = useRef(null)
  
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  const inc = () => onChange(cantidad + 1)
  const dec = () => onChange(Math.max(0, cantidad - 1))
  const subtotal = cantidad * producto.precio_venta

  // Mapeo de colores según el tema asignado
  const themes = {
    oferta:   { borderOn: 'border-rose-400', bgOn: 'bg-rose-50', textOn: 'text-rose-600', btnBg: 'bg-rose-100', btnHover: 'hover:bg-rose-200' },
    bebida:   { borderOn: 'border-blue-400', bgOn: 'bg-blue-50', textOn: 'text-blue-600', btnBg: 'bg-blue-100', btnHover: 'hover:bg-blue-200' },
    sandwich: { borderOn: 'border-emerald-400', bgOn: 'bg-emerald-50', textOn: 'text-emerald-600', btnBg: 'bg-emerald-100', btnHover: 'hover:bg-emerald-200' },
    basico:   { borderOn: 'border-orange-400', bgOn: 'bg-orange-50', textOn: 'text-orange-600', btnBg: 'bg-orange-100', btnHover: 'hover:bg-orange-200' },
  }
  const theme = themes[colorTheme] || themes.basico

  return (
    <div className={`flex flex-col justify-between p-3 rounded-xl border-2 transition-all ${
      cantidad > 0 ? `${theme.borderOn} ${theme.bgOn}` : 'border-gray-100 bg-white shadow-sm'
    }`}>
      
      {/* Header: Nombre y Precio */}
      <div className="mb-3">
        <p className="font-bold text-gray-800 text-sm leading-tight line-clamp-2">
          {producto.nombre}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatearPesos(producto.precio_venta)}
        </p>
      </div>

      {/* Footer: Contador y Subtotal */}
      <div className="mt-auto flex flex-col gap-2">
        {/* Subtotal flotante */}
        {cantidad > 0 && (
          <div className="text-right h-4 flex justify-between items-center">
            <div className="flex gap-1">
              <button onClick={() => onChange(cantidad + 5)} className="text-[10px] bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded text-gray-600 font-bold transition-colors">+5</button>
              <button onClick={() => onChange(cantidad + 10)} className="text-[10px] bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded text-gray-600 font-bold transition-colors">+10</button>
            </div>
            <span className="text-xs font-bold text-green-600">
              {formatearPesos(subtotal)}
            </span>
          </div>
        )}
        {!cantidad && (
          <div className="h-4 flex gap-1">
            <button onClick={() => onChange(cantidad + 5)} className="text-[10px] bg-gray-50 hover:bg-gray-100 px-1.5 py-0.5 rounded text-gray-400 font-bold transition-colors">+5</button>
            <button onClick={() => onChange(cantidad + 10)} className="text-[10px] bg-gray-50 hover:bg-gray-100 px-1.5 py-0.5 rounded text-gray-400 font-bold transition-colors">+10</button>
          </div>
        )}

        {/* Controles */}
        <div className="flex items-center justify-between gap-1 w-full bg-white rounded-lg p-1 border border-gray-100 shadow-sm">
          <button
            type="button"
            onClick={dec}
            disabled={cantidad === 0}
            className="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 active:scale-95 disabled:opacity-30 transition-all"
          >
            <Minus size={14} strokeWidth={2.5} />
          </button>
          
          <input 
            ref={inputRef}
            type="number"
            min="0"
            value={cantidad === 0 ? '' : cantidad}
            onChange={(e) => {
              const val = parseInt(e.target.value)
              onChange(isNaN(val) ? 0 : val)
            }}
            placeholder="0"
            className={`w-8 text-center font-bold text-sm bg-transparent outline-none p-0 border-0 ${cantidad > 0 ? theme.textOn : 'text-gray-400 placeholder:text-gray-300'}`}
          />
          
          <button
            type="button"
            onClick={inc}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-all active:scale-95 ${theme.btnBg} ${theme.textOn} ${theme.btnHover}`}
          >
            <Plus size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Formulario principal ─────────────────────────────────────────────────────
export default function AgregarPedido({ onPedidoCreado, onIrAPedidos, usuarioActual, produccion = [], pedidos = [] }) {
  const [productos, setProductos]   = useState([])
  const [cantidades, setCantidades] = useState({}) // { producto_id: cantidad }
  const [nombreCliente, setNombre]  = useState('Público General')
  // 'fiado' | 'efectivo' | 'transferencia' | 'mixto'
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [montoEfectivo, setMontoEfectivo] = useState('')

  const [horaEntrega, setHoraEntrega] = useState('')
  const [notas, setNotas]                 = useState('')
  const [cargandoProd, setCargProd] = useState(true)
  
  // Cola local para Optimistic UI
  const [syncQueue, setSyncQueue] = useState([])

  const stockHoy = useMemo(
    () => calcularStockHoy(produccion, pedidos),
    [produccion, pedidos]
  )

  const stockPorReceta = useMemo(() => {
    const mapa = {}
    stockHoy.forEach(s => { mapa[s.receta_id] = s.disponible })
    return mapa
  }, [stockHoy])

  const hayProduccionHoy = produccion.length > 0

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
        nombre:          p.nombre,
        cantidad:        cantidades[p.id],
        precio_unitario: p.precio_venta,
      })),
  [productos, cantidades])

  const totalMonto = useMemo(() =>
    items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0),
  [items])

  const esValido = nombreCliente.trim().length >= 2 && items.length > 0

  const { enqueueTask } = useSyncQueue()

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!esValido) return
    
    let fecha_entrega = null
    if (horaEntrega) {
      const hoy = new Date()
      const [h, m] = horaEntrega.split(':')
      hoy.setHours(Number(h), Number(m), 0, 0)
      fecha_entrega = hoy.toISOString()
    }

    const pedidoInfo = {
      nombreCliente:  nombreCliente.trim(),
      items,
      metodoPago,
      montoEfectivo: metodoPago === 'mixto' ? Number(montoEfectivo) : undefined,
      fecha_entrega,
      notas:          notas.trim() || null,
      usuario:        usuarioActual?.nombre || 'sistema',
    }

    const descripcion = `${items.reduce((s, i) => s + i.cantidad, 0)} ítems · ${formatearPesos(totalMonto)}`

    // 1. Agregar a la cola global (Persistent Offline-First)
    await enqueueTask('PEDIDO', pedidoInfo, descripcion)

    // 2. Limpiar el formulario instantáneamente
    setNombre('Público General')
    setCantidades({})
    setMetodoPago('efectivo')
    setMontoEfectivo('')
    setNotas('')
  }

  return (
    <div className="p-4 safe-bottom max-w-lg mx-auto">
      <div className="mb-5 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Nuevo Pedido</h2>
          <p className="text-sm text-gray-500">Optimizado para velocidad</p>
        </div>
      </div>

      <form onSubmit={handleGuardar} className="space-y-4">

        {!hayProduccionHoy && (
          <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
            <div>
              <p className="font-semibold text-amber-800 text-sm">
                Sin cargas registradas hoy
              </p>
              <p className="text-xs text-amber-600">
                Tu mamá aún no registró producción. 
                Puedes igual tomar pedidos.
              </p>
            </div>
          </div>
        )}

        {hayProduccionHoy && stockHoy.length > 0 && (
          <div className="mb-4 flex flex-col gap-2">
            {stockHoy.map((s, index) => (
              <div key={s.nombre || index} className={`flex items-center justify-between rounded-xl px-4 py-2.5 border shadow-sm ${
                s.disponible <= 0 ? 'bg-orange-50 border-orange-200 text-orange-700' :
                s.disponible <= 10 ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-gray-50 border-gray-200 text-gray-700'
              }`}>
                <span className="font-semibold text-sm flex items-center gap-1.5">
                  {s.nombre.toLowerCase().includes('sopaipilla') ? '🥟' : '🥖'} Stock {s.nombre}
                </span>
                <span className="font-bold text-sm">
                  {s.disponible <= 0 ? '⚠️ Agotado' : `${s.disponible} disponibles`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Productos ── */}
        <div>
          <div className="divider-text flex items-center gap-1.5 mb-3">
            <ShoppingCart size={12} className="text-orange-400" />
            Productos
          </div>

          {cargandoProd ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="skeleton h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : productos.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
              Sin productos — ejecuta el SQL de productos.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Categorización automática en frontend */}
              {(() => {
                const ofertas = productos.filter(p => p.nombre.toLowerCase().includes('oferta'))
                const bebidas = productos.filter(p => p.nombre.toLowerCase().match(/té|cafe|café|consom/))
                const sandwiches = productos.filter(p => p.nombre.toLowerCase().match(/ave|aliado|mantequilla|membrillo|churrasco/))
                const basicos = productos.filter(p => !ofertas.includes(p) && !bebidas.includes(p) && !sandwiches.includes(p))

                const Seccion = ({ titulo, items, colorTheme, isFirstSection }) => {
                  if (items.length === 0) return null
                  return (
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-1">
                        {titulo}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {items.map((p, index) => {
                          const tieneReceta = !!(p.receta_id)
                          const stockDisponible = tieneReceta 
                            ? (stockPorReceta[p.receta_id] ?? null) 
                            : null
                          return (
                            <TarjetaProducto
                              key={p.id}
                              producto={p}
                              cantidad={cantidades[p.id] || 0}
                              onChange={v => setCantidad(p.id, v)}
                              colorTheme={colorTheme}
                              stockDisponible={stockDisponible}
                              tieneReceta={tieneReceta}
                              hayProduccionHoy={hayProduccionHoy}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )
                }

                return (
                  <>
                    <Seccion titulo="🍞 Pan y Sopaipillas" items={basicos} colorTheme="basico" isFirstSection={true} />
                    <Seccion titulo="🥪 Sándwiches" items={sandwiches} colorTheme="sandwich" isFirstSection={false} />
                    <Seccion titulo="☕ Bebidas y Sopas" items={bebidas} colorTheme="bebida" isFirstSection={false} />
                    <Seccion titulo="🔥 Ofertas" items={ofertas} colorTheme="oferta" isFirstSection={false} />
                  </>
                )
              })()}
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
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                setNombre('Público General')
                setMostrarSugerencias(false)
              }}
              className={`
                px-3 py-1.5 rounded-full text-xs font-bold border transition-all active:scale-95
                ${nombreCliente === 'Público General'
                  ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                  : 'bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-300'
                }
              `}
            >
              👥 Público General
            </button>
            {clientesFrecuentes.filter(c => c.nombre !== 'Público General').map(c => (
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
        <div>
          <div className="divider-text mt-2 mb-3">Forma de pago</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'fiado',         label: '📒 Fiado',    activeClass: 'border-red-400 bg-red-50 text-red-700'      },
              { value: 'efectivo',      label: '💵 Efectivo', activeClass: 'border-green-500 bg-green-50 text-green-700' },
              { value: 'transferencia', label: '📱 Transf.',  activeClass: 'border-blue-500 bg-blue-50 text-blue-700'   },
            ].map(({ value, label, activeClass }) => (
              <button
                key={value}
                type="button"
                onClick={() => { setMetodoPago(value); setMontoEfectivo('') }}
                className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                  metodoPago === value ? activeClass : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Mixto: cuando pagan parte efectivo y parte transferencia */}
          {metodoPago !== 'fiado' && (
            <button
              type="button"
              onClick={() => setMetodoPago(metodoPago === 'mixto' ? 'efectivo' : 'mixto')}
              className={`mt-2 w-full py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                metodoPago === 'mixto'
                  ? 'border-purple-400 bg-purple-50 text-purple-700'
                  : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
              }`}
            >
              🔀 Mixto (parte efectivo + parte transferencia)
            </button>
          )}

          {metodoPago === 'mixto' && (
            <div className="mt-2 bg-purple-50 rounded-xl px-3 py-2.5 space-y-2">
              <p className="text-xs font-bold text-purple-600">Total: {formatearPesos(totalMonto)}</p>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 font-medium flex-shrink-0 w-20">💵 Efectivo</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={montoEfectivo}
                  onChange={e => setMontoEfectivo(e.target.value)}
                  placeholder="$0"
                  min={0}
                  max={totalMonto}
                  className="input-field !py-1.5 text-sm flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 font-medium flex-shrink-0 w-20">📱 Transf.</label>
                <p className="text-sm font-bold text-blue-600">
                  {formatearPesos(Math.max(0, totalMonto - (Number(montoEfectivo) || 0)))}
                </p>
              </div>
            </div>
          )}

          {metodoPago === 'fiado' && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Queda pendiente de cobro — aparecerá en <strong>Deudas</strong>
            </p>
          )}
        </div>

        {/* ── Hora de Entrega ── */}
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
            placeholder="Ej: Sin sal"
            className="input-field resize-none"
            rows={2}
            maxLength={300}
          />
        </div>

        <button
          type="submit"
          disabled={!esValido}
          className="btn-primary w-full !py-4 text-base mt-2 flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Guardar Pedido
        </button>
      </form>
    </div>
  )
}
