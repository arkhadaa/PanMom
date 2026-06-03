// =============================================
// HistorialCierres.jsx
// Muestra el historial de los cierres de caja pasados.
// =============================================

import { useState, useEffect } from 'react'
import { Loader2, Calendar, DollarSign, ArrowUpRight, ArrowDownRight, Package } from 'lucide-react'
import { listarCierresCaja, formatearPesos } from '../services/supabaseClient'

export default function HistorialCierres() {
  const [cierres, setCierres] = useState([])
  const [cargando, setCargando] = useState(true)

  const cargar = async () => {
    setCargando(true)
    const data = await listarCierresCaja()
    setCierres(data)
    setCargando(false)
  }

  useEffect(() => { cargar() }, [])

  if (cargando) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-orange-500 mb-4" />
        <p className="text-gray-400 font-medium">Cargando historial...</p>
      </div>
    )
  }

  return (
    <div className="p-4 safe-bottom max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">Historial de Caja</h2>
        <p className="text-sm text-gray-500">Resumen de días anteriores</p>
      </div>

      {cierres.length === 0 ? (
        <div className="text-center py-10 card bg-gray-50 border-dashed border-2 border-gray-200">
          <div className="text-4xl mb-3">📭</div>
          <h3 className="font-bold text-gray-700">Sin historial</h3>
          <p className="text-sm text-gray-400">Aún no se ha cerrado ninguna caja.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cierres.map(cierre => {
            const fecha = new Date(cierre.fecha)
            const diaSemana = new Intl.DateTimeFormat('es-CL', { weekday: 'long' }).format(fecha)
            const fechaCorta = fecha.toLocaleDateString('es-CL')
            
            return (
              <div key={cierre.id} className="card !p-0 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Cabecera del cierre */}
                <div className="bg-gray-800 px-4 py-3 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-orange-400" />
                    <div>
                      <p className="font-bold capitalize leading-none">{diaSemana}</p>
                      <p className="text-xs text-gray-400 mt-1">{fechaCorta}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-bold mb-0.5">Caja Final</p>
                    <p className={`font-extrabold text-lg leading-none ${cierre.caja_final >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatearPesos(cierre.caja_final)}
                    </p>
                  </div>
                </div>

                {/* Detalles */}
                <div className="p-4 bg-white space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 rounded-xl px-3 py-2.5">
                      <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-0.5">🛒 Ventas del día</p>
                      <p className="font-extrabold text-gray-800">{formatearPesos(cierre.total_ingresos)}</p>
                    </div>
                    {(cierre.total_cobros_deuda > 0) && (
                      <div className="bg-blue-50 rounded-xl px-3 py-2.5">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-0.5">💰 Cobros fiados</p>
                        <p className="font-extrabold text-gray-800">{formatearPesos(cierre.total_cobros_deuda)}</p>
                      </div>
                    )}
                    <div className="bg-red-50 rounded-xl px-3 py-2.5">
                      <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-0.5">📦 Salidas</p>
                      <p className="font-extrabold text-gray-800">{formatearPesos((cierre.total_gastos || 0) + (cierre.total_retiros || 0))}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                    <Package size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600 font-medium">
                      {cierre.total_pedidos} pedidos en el día
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
