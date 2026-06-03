// =============================================
// Dashboard.jsx
// Pantalla principal: producción, caja del día,
// ventas y estado de pedidos.
// =============================================

import { useMemo, useState, useEffect, memo } from 'react'
import {
  DollarSign, AlertCircle, Clock, ChefHat,
  PackageCheck, TrendingUp, TrendingDown, RefreshCw,
  Percent, Loader2, Trash2, ArrowDownCircle,
  Star, Receipt, ShoppingBag, Wallet
} from 'lucide-react'
import { formatearPesos, calcularResumenProduccion, registrarCierreCaja, calcularStockHoy, calcularDesgloseVentas } from '../services/supabaseClient'

// ─── Tarjeta de estadística ───────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sublabel, bgClass, textClass, iconBg }) {
  return (
    <div className={`stat-card ${bgClass} animate-fade-up`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`rounded-xl p-2 ${iconBg}`}>
          <Icon size={20} className={textClass} strokeWidth={2} />
        </div>
      </div>
      <div className={`stat-value ${textClass}`}>{value}</div>
      <div className={`text-xs font-semibold mt-0.5 ${textClass} opacity-80`}>{label}</div>
      {sublabel && <div className={`text-xs mt-0.5 ${textClass} opacity-60`}>{sublabel}</div>}
    </div>
  )
}

// ─── Formulario rápido de retiro ──────────────────────────────────────────────
function FormRetiro({ onRegistrar }) {
  const [monto, setMonto] = useState('')
  const [desc, setDesc]   = useState('')
  const [cargando, setCarg] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = Number(monto)
    if (!v || v <= 0 || cargando) return
    setCarg(true)
    try {
      await onRegistrar({ monto: v, descripcion: desc.trim() || null })
      setMonto('')
      setDesc('')
    } catch (err) {
      console.error(err)
    } finally {
      setCarg(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card !py-3 space-y-2">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
        <ArrowDownCircle size={12} className="text-orange-400" />
        Registrar retiro
      </p>
      <div className="flex gap-2">
        <input
          type="number"
          value={monto}
          onChange={e => setMonto(e.target.value)}
          placeholder="Monto $"
          min={1}
          className="input-field !py-2 text-sm flex-1 min-w-0"
        />
        <input
          type="text"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Descripción (opcional)"
          maxLength={100}
          className="input-field !py-2 text-sm flex-1 min-w-0 hidden sm:block"
        />
        <button
          type="submit"
          disabled={!monto || cargando}
          className="btn-primary !py-2 !px-4 text-sm flex-shrink-0"
        >
          {cargando ? <Loader2 size={14} className="animate-spin" /> : 'Agregar'}
        </button>
      </div>
      <input
        type="text"
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="Descripción (opcional)"
        maxLength={100}
        className="input-field !py-2 text-sm w-full sm:hidden"
      />
    </form>
  )
}

// ─── Formulario rápido de gasto ──────────────────────────────────────────────
function FormGasto({ onRegistrar }) {
  const [monto, setMonto] = useState('')
  const [desc, setDesc]   = useState('')
  const [cargando, setCarg] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = Number(monto)
    if (!v || v <= 0 || cargando) return
    setCarg(true)
    try {
      await onRegistrar({ monto: v, descripcion: desc.trim() || null })
      setMonto('')
      setDesc('')
    } catch (err) {
      console.error(err)
    } finally {
      setCarg(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card !py-3 space-y-2 mt-2">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
        <ArrowDownCircle size={12} className="text-blue-500" />
        Registrar gasto
      </p>
      <div className="flex gap-2">
        <input
          type="number"
          value={monto}
          onChange={e => setMonto(e.target.value)}
          placeholder="Monto $"
          min={1}
          className="input-field !py-2 text-sm flex-1 min-w-0"
        />
        <input
          type="text"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Descripción (ej. Harina)"
          maxLength={100}
          className="input-field !py-2 text-sm flex-1 min-w-0 hidden sm:block"
        />
        <button
          type="submit"
          disabled={!monto || cargando}
          className="btn-primary !py-2 !px-4 text-sm flex-shrink-0 bg-blue-600 hover:bg-blue-700"
        >
          {cargando ? <Loader2 size={14} className="animate-spin" /> : 'Agregar'}
        </button>
      </div>
      <input
        type="text"
        value={desc}
        onChange={e => setDesc(e.target.value)}
        placeholder="Descripción (ej. Harina)"
        maxLength={100}
        className="input-field !py-2 text-sm w-full sm:hidden"
      />
    </form>
  )
}

// ─── Reloj aislado ──────────────────
const SaludoReloj = memo(function SaludoReloj({ totalPedidos }) {
  const [horaLocal, setHoraLocal] = useState('')
  const [saludo, setSaludo]       = useState('')

  useEffect(() => {
    const actualizar = () => {
      const ahora = new Date()
      setHoraLocal(ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }))
      const h = ahora.getHours()
      setSaludo(h >= 5 && h < 12 ? '¡Buenos días! 🌅' : h < 20 ? '¡Buenas tardes! ☀️' : '¡Buenas noches! 🌙')
    }
    actualizar()
    const t = setInterval(actualizar, 10000)
    return () => clearInterval(t)
  }, [])

  const fechaHoy = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date())

  return (
    <div>
      <p className="text-xs font-medium text-gray-400 capitalize flex items-center gap-1.5">
        {fechaHoy} <span className="w-1 h-1 bg-gray-300 rounded-full" /> <span className="font-bold text-gray-500">{horaLocal}</span>
      </p>
      <h2 className="text-xl font-bold text-gray-800">{saludo}</h2>
      <p className="text-sm text-gray-500">
        {totalPedidos === 0 ? 'Sin pedidos todavía hoy' : `${totalPedidos} pedido${totalPedidos !== 1 ? 's' : ''} hoy`}
      </p>
    </div>
  )
})

// ─── Dashboard principal ──────────────────────────────────────────────────────
export default function Dashboard({
  pedidos, produccion, gastos = [], retiros = [], cajaHoy = { ingresos_efectivo: 0, ingresos_transferencia: 0, total_gastos: 0, total_retiros: 0, caja_efectivo_final: 0 },
  cargando, onRefresh, costos,
  onIrACostos, onIrAProduccion, onRegistrarRetiro, onEliminarRetiro,
  onRegistrarGasto, onEliminarGasto,
  usuarioActual,
}) {
  const [cerrandoCaja, setCerrandoCaja] = useState(false)

  const CLAVE_CIERRE = 'inesbread_cajaCerrada'
  const hoyStr = new Date().toLocaleDateString('es-CL')

  const [cajaCerrada, setCajaCerrada] = useState(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE_CIERRE) || 'null')
      return guardado?.fecha === hoyStr ? guardado.hora : false
    } catch { return false }
  })

  // ── Totales de pedidos ──
  const stats = useMemo(() => {
    const hoy = (pedidos || []).filter(p => p.estado !== 'anulado')

    const dineroEsperado  = hoy.reduce((s, p) => s + (p.monto_pesos || 0), 0)
    
    // Ahora tomamos el dinero abonado directamente desde pagos_cliente
    const dineroRecibido  = hoy.reduce((s, p) => {
      const pagos = p.pagos_cliente || []
      const abonado = pagos.reduce((sum, pago) => sum + (pago.monto_efectivo || 0) + (pago.monto_transferencia || 0), 0)
      return s + abonado
    }, 0)
    
    // El pendiente real es la suma de lo esperado menos lo recibido de esos pedidos
    const dineroPendiente = hoy.reduce((s, p) => {
      const pagos = p.pagos_cliente || []
      const abonado = pagos.reduce((sum, pago) => sum + (pago.monto_efectivo || 0) + (pago.monto_transferencia || 0), 0)
      return s + Math.max(0, (p.monto_pesos || 0) - abonado)
    }, 0)
    
    const cantPendientes = hoy.filter(p => p.estado === 'pendiente').length
    const cantListos     = hoy.filter(p => p.estado === 'listo').length
    const cantEntregados = hoy.filter(p => p.estado === 'entregado').length
    
    const totalPedidos = hoy.length
    const porcentajePago = totalPedidos > 0 ? Math.round((dineroRecibido / dineroEsperado) * 100) : 0
    const ticketPromedio = totalPedidos > 0 ? Math.round(dineroEsperado / totalPedidos) : 0

    const conteoProductos = {}
    hoy.forEach(p => {
      if (p.pedido_items) {
        p.pedido_items.forEach(item => {
          const nombre = item.productos?.nombre || 'Desconocido'
          conteoProductos[nombre] = (conteoProductos[nombre] || 0) + item.cantidad
        })
      }
    })
    
    let productoEstrella = 'Ninguno'
    let maxCant = 0
    Object.entries(conteoProductos).forEach(([nombre, cant]) => {
      if (cant > maxCant) {
        maxCant = cant
        productoEstrella = nombre
      }
    })

    return {
      dineroEsperado, dineroPendiente, dineroRecibido,
      cantPendientes, cantListos, cantEntregados,
      totalPedidos, porcentajePago, ticketPromedio,
      productoEstrella, maxCant
    }
  }, [pedidos])

  // ── Resumen de producción ──
  const resumenProd = useMemo(
    () => calcularResumenProduccion(produccion),
    [produccion]
  )
  const hayProduccion = resumenProd.totalCargas > 0

  // ── Stock disponible ──
  const stockHoy = useMemo(
    () => calcularStockHoy(produccion, pedidos),
    [produccion, pedidos]
  )

  // ── Desglose de ventas ──
  const desgloseVentas = useMemo(
    () => calcularDesgloseVentas(pedidos),
    [pedidos]
  )

  const handleCerrarCaja = async () => {
    if (!window.confirm('¿Estás seguro de cerrar la caja de hoy? Esto guardará los totales en el historial.')) return
    
    setCerrandoCaja(true)
    try {
      await registrarCierreCaja({
        total_ingresos_efectivo: cajaHoy.ingresos_efectivo,
        total_ingresos_transferencia: cajaHoy.ingresos_transferencia,
        total_gastos:      cajaHoy.total_gastos,
        total_retiros:     cajaHoy.total_retiros,
        total_ventas:      stats.dineroEsperado,
        total_deuda_generada: stats.dineroPendiente,
      })
      const horaActual = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
      localStorage.setItem(CLAVE_CIERRE, JSON.stringify({ fecha: hoyStr, hora: horaActual }))
      setCajaCerrada(horaActual)
    } catch (e) {
      console.error('Error cerrando caja:', e)
      alert(`Error cerrando caja:\n${e?.message || JSON.stringify(e)}`)
    } finally {
      setCerrandoCaja(false)
    }
  }

  return (
    <div className="p-4 safe-bottom max-w-4xl mx-auto">

      {/* ── Saludo ── */}
      <div className="flex items-center justify-between mb-5">
        <SaludoReloj totalPedidos={stats.totalPedidos} />
        <button
          onClick={onRefresh}
          disabled={cargando}
          className={`btn-secondary gap-1.5 ${cargando ? 'opacity-50' : ''}`}
        >
          <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* PRODUCCIÓN DEL DÍA */}
      {['productor', 'superadmin'].includes(usuarioActual?.rol) && (
        <section className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            🏭 Producción del día
          </h3>
          <button
            onClick={onIrAProduccion}
            className="flex items-center gap-1 text-xs text-orange-500 font-semibold"
          >
            <ChefHat size={12} />
            {hayProduccion ? 'Ver más' : 'Registrar'}
          </button>
        </div>

        {!hayProduccion ? (
          <div
            onClick={onIrAProduccion}
            className="card border-dashed border-2 border-orange-200 text-center py-6 cursor-pointer hover:bg-orange-50 transition-colors"
          >
            <p className="text-3xl mb-2">🍞</p>
            <p className="text-sm font-semibold text-gray-700">Sin producción registrada hoy</p>
            <p className="text-xs text-gray-400 mt-1">Toca aquí para registrar las cargas horneadas.</p>
            <span className="inline-block mt-3 text-xs font-bold text-orange-500 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full">
              + Registrar cargas →
            </span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <StatCard
                icon={ChefHat}
                label="Cargas realizadas"
                value={resumenProd.totalCargas}
                sublabel={`${resumenProd.totalPanes} panes estimados`}
                bgClass="bg-gradient-to-br from-amber-500 to-orange-600"
                textClass="text-white"
                iconBg="bg-white/20"
              />
              <StatCard
                icon={TrendingUp}
                label="Ingreso estimado"
                value={formatearPesos(resumenProd.totalIngreso)}
                sublabel="si se vende todo"
                bgClass="bg-gradient-to-br from-emerald-500 to-teal-600"
                textClass="text-white"
                iconBg="bg-white/20"
              />
              <StatCard
                icon={TrendingDown}
                label="Costo producción"
                value={formatearPesos(resumenProd.totalCosto)}
                sublabel="materia prima"
                bgClass="bg-gradient-to-br from-purple-500 to-indigo-600"
                textClass="text-white"
                iconBg="bg-white/20"
              />
              <StatCard
                icon={Percent}
                label="Ganancia estimada"
                value={formatearPesos(resumenProd.ganancia)}
                sublabel={`${resumenProd.margen}% de margen`}
                bgClass={resumenProd.ganancia >= 0
                  ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                  : 'bg-gradient-to-br from-red-400 to-rose-500'
                }
                textClass="text-white"
                iconBg="bg-white/20"
              />
            </div>

            <div className="card !py-3">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-2">
                <span>Margen de ganancia</span>
                <span className={`font-bold ${
                  resumenProd.margen >= 50 ? 'text-green-600' :
                  resumenProd.margen >= 30 ? 'text-amber-600' : 'text-red-600'
                }`}>{resumenProd.margen}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    resumenProd.margen >= 50 ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                    resumenProd.margen >= 30 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                    'bg-gradient-to-r from-red-400 to-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, resumenProd.margen))}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                <span>Costo: {formatearPesos(resumenProd.totalCosto)}</span>
                <span>Ingreso: {formatearPesos(resumenProd.totalIngreso)}</span>
              </div>
            </div>
          </>
        )}

        {stockHoy.length > 0 && (
          <div className="mt-3 space-y-2">
            {stockHoy.map(s => (
              <div key={s.nombre} className="bg-white rounded-xl px-4 py-3 border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-700">🍞 {s.nombre}</p>
                  <p className="text-xs text-gray-400">{s.producidos} producidos · {s.vendidos} vendidos</p>
                </div>
                <div className={`text-right`}>
                  <p className={`text-2xl font-extrabold ${
                    s.disponible <= 0 ? 'text-red-500' :
                    s.disponible <= 5 ? 'text-amber-500' : 'text-green-600'
                  }`}>{Math.max(0, s.disponible)}</p>
                  <p className="text-xs text-gray-400">disponibles</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      )}

      {/* VENTAS DEL DÍA */}
      <section className="mb-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
          💰 Ventas del día
        </h3>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <StatCard
            icon={Receipt}
            label="Gasto Promedio"
            value={formatearPesos(stats.ticketPromedio)}
            sublabel="Gasto por cliente"
            bgClass="bg-gradient-to-br from-blue-500 to-indigo-600"
            textClass="text-white"
            iconBg="bg-white/20"
          />
          <StatCard
            icon={Star}
            label="Más vendido"
            value={stats.productoEstrella}
            sublabel={`${stats.maxCant} unidades vendidas`}
            bgClass="bg-gradient-to-br from-amber-400 to-orange-500"
            textClass="text-white"
            iconBg="bg-white/20"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCard
            icon={ShoppingBag}
            label="Ventas Hoy"
            value={formatearPesos(stats.dineroEsperado)}
            sublabel={`${stats.totalPedidos} pedidos totales`}
            bgClass="bg-gradient-to-br from-teal-500 to-cyan-600"
            textClass="text-white"
            iconBg="bg-white/20"
          />
          <StatCard
            icon={DollarSign}
            label="Recibido"
            value={formatearPesos(stats.dineroRecibido)}
            sublabel={`${stats.porcentajePago}% de pedidos pagados`}
            bgClass="bg-gradient-to-br from-green-400 to-emerald-500"
            textClass="text-white"
            iconBg="bg-white/20"
          />
          <StatCard
            icon={AlertCircle}
            label="Por cobrar"
            value={formatearPesos(stats.dineroPendiente)}
            sublabel="ventas de hoy pendientes"
            bgClass={stats.dineroPendiente > 0
              ? 'bg-gradient-to-br from-red-400 to-rose-500'
              : 'bg-gradient-to-br from-gray-300 to-gray-400'
            }
            textClass="text-white"
            iconBg="bg-white/20"
          />
        </div>
      </section>

      {/* Desglose de ventas por producto */}
      {desgloseVentas.length > 0 && (
        <section className="mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            📦 Vendido hoy por producto
          </h3>
          <div className="card !p-0 overflow-hidden">
            {desgloseVentas.map((item, i) => (
              <div key={item.nombre} className={`flex items-center justify-between px-4 py-3 ${i < desgloseVentas.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-extrabold text-orange-400 w-8 text-right">{item.cantidad}</span>
                  <span className="text-sm font-semibold text-gray-700">{item.nombre}</span>
                </div>
                <span className="text-sm font-bold text-green-600">{formatearPesos(item.total)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CAJA DEL DÍA */}
      <section className="mb-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
          💵 Caja del día
        </h3>

        <div className="card !p-0 overflow-hidden mb-3">
          {[
            { label: '💵 Ingresos Efectivo',      value: cajaHoy.ingresos_efectivo,          positivo: true  },
            { label: '📱 Ingresos Transferencia', value: cajaHoy.ingresos_transferencia,     positivo: true  },
            { label: '📦 Gastos',                 value: cajaHoy.total_gastos,              positivo: false },
            { label: '💸 Retiros',                value: cajaHoy.total_retiros,             positivo: false },
          ].filter(({ value, positivo }) => !positivo || value > 0)
           .map(({ label, value, positivo }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-600">{label}</span>
              <span className={`font-bold text-sm ${positivo ? 'text-green-600' : value > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                {positivo ? '' : value > 0 ? '−' : ''}{formatearPesos(value)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t-2 border-gray-200">
            <div>
              <span className="font-bold text-gray-700 block">🏦 Caja física</span>
              <span className="text-[10px] text-gray-500 block leading-tight mt-0.5">Dinero real en cajón (solo efectivo)</span>
            </div>
            <span className={`font-bold text-lg ${cajaHoy.caja_efectivo_final >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatearPesos(cajaHoy.caja_efectivo_final)}
            </span>
          </div>
        </div>

        {usuarioActual?.rol === 'superadmin' && (
          <div className="mb-4">
            {cajaCerrada ? (
              <div className="w-full rounded-xl bg-green-50 border border-green-200 px-4 py-3.5 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-extrabold text-base">✅ Caja cerrada hoy</span>
                </div>
                <p className="text-xs text-green-700">
                  Guardada a las <strong>{cajaCerrada}</strong> — los totales están en el Historial.
                </p>
                <button
                  onClick={() => {
                    if (!window.confirm('¿Cerrar caja de nuevo? Se guardará otro registro en el historial.')) return
                    localStorage.removeItem(CLAVE_CIERRE)
                    setCajaCerrada(false)
                  }}
                  className="text-[11px] text-green-500 underline text-left mt-0.5 w-fit"
                >
                  Registrar otro cierre
                </button>
              </div>
            ) : (
              <button
                onClick={handleCerrarCaja}
                disabled={cerrandoCaja}
                className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-gray-800 text-white hover:bg-gray-700 active:scale-95 transition-all shadow-sm disabled:opacity-60"
              >
                {cerrandoCaja
                  ? <><Loader2 size={18} className="animate-spin" /> Guardando historial...</>
                  : <>🔒 Guardar Cierre de Caja en Historial</>
                }
              </button>
            )}
          </div>
        )}

        {onRegistrarGasto && (
          <FormGasto onRegistrar={onRegistrarGasto} />
        )}

        {onRegistrarRetiro && (
          <FormRetiro onRegistrar={onRegistrarRetiro} />
        )}

        {(gastos.length > 0 || retiros.length > 0) && (
          <div className="mt-4 space-y-3">
            {gastos.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 font-medium mb-1.5">Gastos registrados:</p>
                <div className="space-y-1.5">
                  {gastos.map(g => (
                    <div key={g.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-gray-100">
                      <span className="text-sm text-gray-600 flex-1 truncate">{g.descripcion || 'Gasto'}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-bold text-sm text-blue-600">{formatearPesos(g.monto)}</span>
                        {onEliminarGasto && (
                          <button
                            onClick={() => onEliminarGasto(g.id)}
                            className="text-gray-300 hover:text-red-400 transition-colors"
                            title="Eliminar gasto"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {retiros.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 font-medium mb-1.5">Retiros registrados:</p>
                <div className="space-y-1.5">
                  {retiros.map(r => (
                    <div key={r.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-gray-100">
                      <span className="text-sm text-gray-600 flex-1 truncate">{r.descripcion || 'Retiro'}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-bold text-sm text-orange-600">{formatearPesos(r.monto)}</span>
                        {onEliminarRetiro && (
                          <button
                            onClick={() => onEliminarRetiro(r.id)}
                            className="text-gray-300 hover:text-red-400 transition-colors"
                            title="Eliminar retiro"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ESTADO DE PEDIDOS */}
      <section className="mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
          📋 Estado de pedidos
        </h3>
        <div className="card p-0 overflow-hidden">
          {[
            { icon: Clock,        label: 'Pendientes',           value: stats.cantPendientes, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
            { icon: PackageCheck, label: 'Listos para entregar', value: stats.cantListos,     color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100'  },
            { icon: PackageCheck, label: 'Entregados',           value: stats.cantEntregados, color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-100'   },
          ].map(({ icon: Icon, label, value, color, bg, border }, i, arr) => (
            <div
              key={label}
              className={`flex items-center justify-between px-4 py-3 ${bg} ${i < arr.length - 1 ? `border-b ${border}` : ''}`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className={color} strokeWidth={2} />
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </div>
              <span className={`text-xl font-bold ${color}`}>{value}</span>
            </div>
          ))}
        </div>
      </section>

      {!cargando && stats.totalPedidos === 0 && (
        <div className="card text-center py-8">
          <div className="text-5xl mb-3">🍞</div>
          <h3 className="font-bold text-gray-700 mb-1">Sin pedidos hoy</h3>
          <p className="text-sm text-gray-400">
            Toca <strong>Agregar</strong> para registrar el primer pedido del día.
          </p>
        </div>
      )}

      {cargando && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 w-full" />)}
        </div>
      )}
    </div>
  )
}
