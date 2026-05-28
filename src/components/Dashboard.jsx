// =============================================
// Dashboard.jsx
// Pantalla principal: producción, caja del día,
// ventas y estado de pedidos.
// =============================================

import { useMemo, useState, useEffect } from 'react'
import {
  DollarSign, AlertCircle, Clock, ChefHat,
  PackageCheck, TrendingUp, TrendingDown, RefreshCw,
  Percent, Loader2, Trash2, ArrowDownCircle,
  Star, Receipt, ShoppingBag
} from 'lucide-react'
import { formatearPesos, calcularResumenProduccion, calcularCajaHoy, registrarCierreCaja } from '../services/supabaseClient'

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
      {/* Descripción visible en mobile */}
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

// ─── Dashboard principal ──────────────────────────────────────────────────────
export default function Dashboard({
  pedidos, produccion, gastos = [], retiros = [],
  cargando, onRefresh, costos,
  onIrACostos, onIrAProduccion, onRegistrarRetiro, onEliminarRetiro,
  usuarioActual,
}) {
  const [cerrandoCaja, setCerrandoCaja] = useState(false)
  const [cajaCerrada, setCajaCerrada] = useState(false)

  // ── Totales de pedidos ──
  const stats = useMemo(() => {
    // Excluir anulados para que no sumen a los totales ni a la producción
    const hoy = (pedidos || []).filter(p => p.estado !== 'anulado')

    // ── Nuevo cálculo de KPIs ──
    const dineroEsperado  = hoy.reduce((s, p) => s + (p.monto_pesos || 0), 0)
    const dineroPendiente = hoy.filter(p => !p.pagado).reduce((s, p) => s + (p.monto_pesos || 0), 0)
    const dineroRecibido  = hoy.filter(p =>  p.pagado).reduce((s, p) => s + (p.monto_pesos || 0), 0)
    
    const cantPendientes  = hoy.filter(p => p.estado === 'pendiente').length
    const cantProduciendo = hoy.filter(p => p.estado === 'produciendo').length
    const cantListos      = hoy.filter(p => p.estado === 'listo').length
    const cantEntregados  = hoy.filter(p => p.estado === 'entregado').length
    
    const totalPedidos = hoy.length
    const porcentajePago = totalPedidos > 0 ? Math.round((dineroRecibido / dineroEsperado) * 100) : 0
    const ticketPromedio = totalPedidos > 0 ? Math.round(dineroEsperado / totalPedidos) : 0

    // Producto más vendido del día
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
      cantPendientes, cantProduciendo, cantListos, cantEntregados,
      totalPedidos, porcentajePago, ticketPromedio,
      productoEstrella, maxCant
    }
  }, [pedidos])

  // ── Caja del día ──
  const caja = useMemo(
    () => calcularCajaHoy(pedidos, gastos, retiros),
    [pedidos, gastos, retiros]
  )

  // ── Resumen de producción ──
  const resumenProd = useMemo(
    () => calcularResumenProduccion(produccion),
    [produccion]
  )
  const hayProduccion = resumenProd.totalCargas > 0

  // Fecha y Hora
  const fechaHoy = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date())

  const [horaLocal, setHoraLocal] = useState('')
  const [saludo, setSaludo] = useState('¡Buenos días! 🌅')

  useEffect(() => {
    const actualizarReloj = () => {
      const ahora = new Date()
      setHoraLocal(ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }))
      
      const hora = ahora.getHours()
      if (hora >= 5 && hora < 12) setSaludo('¡Buenos días! 🌅')
      else if (hora >= 12 && hora < 20) setSaludo('¡Buenas tardes! ☀️')
      else setSaludo('¡Buenas noches! 🌙')
    }
    actualizarReloj()
    const timer = setInterval(actualizarReloj, 10000) // actualizar cada 10 seg
    return () => clearInterval(timer)
  }, [])

  const handleCerrarCaja = async () => {
    if (!window.confirm('¿Estás seguro de cerrar la caja de hoy? Esto guardará los totales en el historial.')) return
    
    setCerrandoCaja(true)
    try {
      await registrarCierreCaja({
        total_ingresos: caja.cobrado,
        total_gastos: caja.totalGastos,
        total_retiros: caja.totalRetiros,
        caja_final: caja.caja,
        total_pedidos: stats.totalPedidos
      })
      setCajaCerrada(true)
      setTimeout(() => setCajaCerrada(false), 3000)
    } catch (e) {
      alert('Error cerrando caja')
    } finally {
      setCerrandoCaja(false)
    }
  }

  return (
    <div className="p-4 safe-bottom max-w-4xl mx-auto">

      {/* ── Saludo ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-medium text-gray-400 capitalize flex items-center gap-1.5">
            {fechaHoy} <span className="w-1 h-1 bg-gray-300 rounded-full"></span> <span className="font-bold text-gray-500">{horaLocal}</span>
          </p>
          <h2 className="text-xl font-bold text-gray-800">{saludo}</h2>
          <p className="text-sm text-gray-500">
            {stats.totalPedidos === 0
              ? 'Sin pedidos todavía hoy'
              : `${stats.totalPedidos} pedido${stats.totalPedidos !== 1 ? 's' : ''} hoy`}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={cargando}
          className={`btn-secondary gap-1.5 ${cargando ? 'opacity-50' : ''}`}
        >
          <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════
          SECCIÓN 1: PRODUCCIÓN DEL DÍA
          ══════════════════════════════════════════ */}
      {usuarioActual?.rol === 'admin' && (
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

            {/* Barra de margen */}
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
      </section>
      )}

      {/* ══════════════════════════════════════════
          SECCIÓN 2: VENTAS DEL DÍA
          ══════════════════════════════════════════ */}
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
            value={stats.totalPedidos}
            sublabel="Pedidos totales"
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
            sublabel="clientes que deben"
            bgClass={stats.dineroPendiente > 0
              ? 'bg-gradient-to-br from-red-400 to-rose-500'
              : 'bg-gradient-to-br from-gray-300 to-gray-400'
            }
            textClass="text-white"
            iconBg="bg-white/20"
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECCIÓN 3: CAJA DEL DÍA
          ══════════════════════════════════════════ */}
      <section className="mb-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
          💵 Caja del día
        </h3>

        {/* Resumen caja */}
        <div className="card !p-0 overflow-hidden mb-3">
          {[
            { label: '✅ Cobrado',  value: caja.cobrado,       positivo: true  },
            { label: '📦 Gastos',   value: caja.totalGastos,   positivo: false },
            { label: '💸 Retiros',  value: caja.totalRetiros,  positivo: false },
          ].map(({ label, value, positivo }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-600">{label}</span>
              <span className={`font-bold text-sm ${positivo ? 'text-green-600' : value > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                {positivo ? '' : value > 0 ? '−' : ''}{formatearPesos(value)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t-2 border-gray-200">
            <span className="font-bold text-gray-700">🏦 Caja real</span>
            <span className={`font-bold text-lg ${caja.caja >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatearPesos(caja.caja)}
            </span>
          </div>
        </div>

        {/* Botón Cierre de Caja (Solo Admin) */}
        {usuarioActual?.rol === 'admin' && (
          <div className="mb-4">
            <button
              onClick={handleCerrarCaja}
              disabled={cerrandoCaja || cajaCerrada}
              className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm
                ${cajaCerrada 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-gray-800 text-white hover:bg-gray-700 active:scale-95'
                }`}
            >
              {cerrandoCaja ? (
                <><Loader2 size={18} className="animate-spin" /> Guardando historial...</>
              ) : cajaCerrada ? (
                <>✅ Caja Cerrada Correctamente</>
              ) : (
                <>🔒 Guardar Cierre de Caja en Historial</>
              )}
            </button>
          </div>
        )}

        {/* Formulario retiro */}
        {onRegistrarRetiro && (
          <FormRetiro onRegistrar={onRegistrarRetiro} />
        )}

        {/* Lista de retiros del día */}
        {retiros.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-400 font-medium mb-1.5">Retiros registrados:</p>
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
        )}
      </section>

      {/* ══════════════════════════════════════════
          SECCIÓN 4: ESTADO DE PEDIDOS
          ══════════════════════════════════════════ */}
      <section className="mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
          📋 Estado de pedidos
        </h3>
        <div className="card p-0 overflow-hidden">
          {[
            { icon: Clock,        label: 'Pendientes',           value: stats.cantPendientes,  color: 'text-yellow-600', bg: 'bg-yellow-50',  border: 'border-yellow-100' },
            { icon: ChefHat,      label: 'En producción',        value: stats.cantProduciendo, color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-100'   },
            { icon: PackageCheck, label: 'Listos para entregar', value: stats.cantListos,      color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-100'  },
            { icon: PackageCheck, label: 'Entregados',           value: stats.cantEntregados,  color: 'text-gray-500',   bg: 'bg-gray-50',    border: 'border-gray-100'   },
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

      {/* ── Sin pedidos placeholder ── */}
      {!cargando && stats.totalPedidos === 0 && (
        <div className="card text-center py-8">
          <div className="text-5xl mb-3">🍞</div>
          <h3 className="font-bold text-gray-700 mb-1">Sin pedidos hoy</h3>
          <p className="text-sm text-gray-400">
            Toca <strong>Agregar</strong> para registrar el primer pedido del día.
          </p>
        </div>
      )}

      {/* ── Skeleton ── */}
      {cargando && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 w-full" />)}
        </div>
      )}
    </div>
  )
}
