import { useState, useEffect, useMemo } from 'react'
import { DollarSign, Wallet, TrendingUp, TrendingDown, Users, AlertCircle, ShoppingBag, Receipt } from 'lucide-react'
import { formatearPesos, obtenerFlujoSemanal, obtenerRetirosMensuales, listarCuentasClientes, listarRecetas, calcularCostoReceta } from '../services/supabaseClient'

export default function Finanzas({ cajaFisica = 0, usuarioActual }) {
  const [flujoSemana, setFlujoSemana] = useState(null)
  const [retirosMes, setRetirosMes] = useState(null)
  const [topDeudores, setTopDeudores] = useState([])
  const [totalDeuda, setTotalDeuda] = useState(0)
  const [margenes, setMargenes] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      try {
        const [flujo, retiros, cuentas, recetas] = await Promise.all([
          obtenerFlujoSemanal(),
          obtenerRetirosMensuales(),
          listarCuentasClientes(),
          listarRecetas().catch(() => [])
        ])
        
        setFlujoSemana(flujo)
        setRetirosMes(retiros)
        
        const adeudados = cuentas.filter(c => c.saldo > 0)
        setTotalDeuda(adeudados.reduce((acc, c) => acc + c.saldo, 0))
        setTopDeudores(adeudados.slice(0, 3)) // Top 3

        const calculosMargen = (recetas || []).map(r => {
          const { costoCarga } = calcularCostoReceta(r)
          const panes = r.panes_por_carga || 1
          const costoUnidad = Math.round(costoCarga / panes)
          const precioVenta = r.precio_venta || 0
          const margen = precioVenta - costoUnidad
          return { nombre: r.nombre, costo: costoUnidad, venta: precioVenta, margen }
        }).sort((a, b) => b.margen - a.margen)
        
        setMargenes(calculosMargen)

      } catch (err) {
        console.error('Error cargando finanzas:', err)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  if (cargando) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}
      </div>
    )
  }

  const capitalTeorico = cajaFisica + totalDeuda

  return (
    <div className="p-4 safe-bottom max-w-4xl mx-auto space-y-6">
      
      {/* ── BLOQUE A: CAPITAL DEL NEGOCIO ── */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
          🏦 Capital del Negocio
        </h3>
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-md">
          <p className="text-sm font-semibold opacity-90 mb-1">Capital Teórico Neto</p>
          <p className="text-4xl font-black mb-4">{formatearPesos(capitalTeorico)}</p>
          
          <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4 mt-2">
            <div>
              <p className="text-xs opacity-80 font-medium">Caja Física Actual</p>
              <p className="text-lg font-bold">{formatearPesos(cajaFisica)}</p>
              <p className="text-[10px] opacity-70 mt-0.5">Dinero real para retirar</p>
            </div>
            <div>
              <p className="text-xs opacity-80 font-medium">Plata en la Calle (Fíados)</p>
              <p className="text-lg font-bold">{formatearPesos(totalDeuda)}</p>
              <p className="text-[10px] opacity-70 mt-0.5">Dinero pendiente de cobro</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── BLOQUE B: TOP DEUDORES ── */}
      {topDeudores.length > 0 && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
            <AlertCircle size={14} className="text-red-400" />
            Top 3 Deudores (Prioridad Cobro)
          </h3>
          <div className="bg-white rounded-xl border border-red-100 divide-y divide-gray-100 overflow-hidden shadow-sm">
            {topDeudores.map((d, i) => (
              <div key={d.id} className="flex justify-between items-center p-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-gray-700">{d.nombre}</span>
                </div>
                <span className="font-bold text-red-600">{formatearPesos(d.saldo)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── BLOQUE C: FLUJO SEMANAL ── */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
          📊 Flujo Semanal (Lun - Dom)
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="card !p-3">
            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
              <ShoppingBag size={14} /> <span className="text-xs font-semibold">Ventas Totales</span>
            </div>
            <p className="text-lg font-bold text-gray-800">{formatearPesos(flujoSemana?.ventas)}</p>
          </div>
          <div className="card !p-3 bg-green-50 border-green-100">
            <div className="flex items-center gap-1.5 text-green-700 mb-1">
              <DollarSign size={14} /> <span className="text-xs font-semibold">Ingresos Reales</span>
            </div>
            <p className="text-lg font-bold text-green-700">{formatearPesos(flujoSemana?.ingresos)}</p>
          </div>
          <div className="card !p-3 bg-red-50 border-red-100">
            <div className="flex items-center gap-1.5 text-red-700 mb-1">
              <TrendingDown size={14} /> <span className="text-xs font-semibold">Gastos</span>
            </div>
            <p className="text-lg font-bold text-red-700">{formatearPesos(flujoSemana?.gastos)}</p>
          </div>
          <div className="card !p-3 bg-orange-50 border-orange-100">
            <div className="flex items-center gap-1.5 text-orange-700 mb-1">
              <Wallet size={14} /> <span className="text-xs font-semibold">Retiros</span>
            </div>
            <p className="text-lg font-bold text-orange-700">{formatearPesos(flujoSemana?.retiros)}</p>
          </div>
        </div>
        <div className="mt-2 bg-gray-800 rounded-xl p-3 flex justify-between items-center text-white">
          <span className="text-sm font-semibold">Disponible Neto (Semana)</span>
          <span className="text-xl font-bold">{formatearPesos(flujoSemana?.disponible)}</span>
        </div>
      </section>

      {/* ── BLOQUE D: RESUMEN MENSUAL DE RETIROS ── */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
          💸 Distribución de Retiros (Mes Actual)
        </h3>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-3">Total retirado este mes: <b className="text-gray-800">{formatearPesos(retirosMes?.totalMensual)}</b></p>
          
          <div className="space-y-3 mb-5">
            {retirosMes?.resumen.map(r => (
              <div key={r.usuario} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-orange-400" />
                  <span className="font-semibold text-gray-700">{r.usuario}</span>
                </div>
                <span className="font-bold">{formatearPesos(r.total)}</span>
              </div>
            ))}
            {retirosMes?.resumen.length === 0 && (
              <p className="text-xs text-gray-400 text-center italic">Nadie ha retirado plata este mes.</p>
            )}
          </div>

          <h4 className="text-[10px] font-bold uppercase text-gray-400 mb-2 border-t pt-3">Últimos movimientos</h4>
          <div className="space-y-2">
            {retirosMes?.ultimos.map(r => {
              const fecha = new Date(r.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
              return (
                <div key={r.id} className="flex justify-between text-xs items-center bg-gray-50 rounded-lg p-2">
                  <div className="flex gap-2 text-gray-600">
                    <span className="font-semibold">{fecha}</span>
                    <span>-</span>
                    <span className="font-bold">{r.usuario}</span>
                    {r.descripcion && <span className="text-gray-400">({r.descripcion})</span>}
                  </div>
                  <span className="font-bold text-gray-700">{formatearPesos(r.monto)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── BLOQUE E: MARGEN ESTIMADO POR PRODUCTO ── */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
          📈 Margen Estimado (Por unidad)
        </h3>
        <p className="text-xs text-gray-500 mb-3 leading-tight">
          Calculado en base a receta. Solo incluye ingredientes, no considera luz, agua ni gastos operacionales.
        </p>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Producto</th>
                <th className="px-3 py-2 font-semibold text-right">Costo</th>
                <th className="px-3 py-2 font-semibold text-right">Venta</th>
                <th className="px-3 py-2 font-semibold text-right">Margen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {margenes.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-3 py-4 text-center text-xs text-gray-400">
                    Calculando márgenes...
                  </td>
                </tr>
              ) : (
                margenes.map((m, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 font-medium text-gray-800">{m.nombre}</td>
                    <td className="px-3 py-2 text-right text-red-600 font-semibold">{formatearPesos(m.costo)}</td>
                    <td className="px-3 py-2 text-right text-green-600 font-semibold">{formatearPesos(m.venta)}</td>
                    <td className="px-3 py-2 text-right text-indigo-600 font-bold">{formatearPesos(m.margen)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  )
}
