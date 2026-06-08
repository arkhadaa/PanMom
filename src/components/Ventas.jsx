import { useMemo } from 'react'
import { TrendingUp, ShoppingBag, Award, BarChart3 } from 'lucide-react'
import { formatearPesos } from '../services/supabaseClient'

export default function Ventas({ pedidos }) {
  const { desglose, masVendido, masIngresos } = useMemo(() => {
    const resumen = {}

    const pedidosValidos = (pedidos || []).filter(p => p.estado !== 'anulado')

    for (const pedido of pedidosValidos) {
      if (!pedido.pedido_items) continue
      for (const item of pedido.pedido_items) {
        const nombreProducto = item.productos?.nombre || 'Producto Desconocido'
        const cantidad = Number(item.cantidad) || 0
        const ingresos = cantidad * (Number(item.precio_unitario) || 0)

        if (!resumen[nombreProducto]) {
          resumen[nombreProducto] = { unidades: 0, ingresos: 0 }
        }
        resumen[nombreProducto].unidades += cantidad
        resumen[nombreProducto].ingresos += ingresos
      }
    }

    const desgloseArray = Object.entries(resumen)
      .map(([nombre, stats]) => ({ nombre, ...stats }))
      .sort((a, b) => b.unidades - a.unidades)

    let masVendidoItem = null
    let masIngresosItem = null

    if (desgloseArray.length > 0) {
      masVendidoItem = desgloseArray[0] // Ya está ordenado por unidades
      masIngresosItem = [...desgloseArray].sort((a, b) => b.ingresos - a.ingresos)[0]
    }

    return { desglose: desgloseArray, masVendido: masVendidoItem, masIngresos: masIngresosItem }
  }, [pedidos])

  if (!pedidos || pedidos.length === 0 || desglose.length === 0) {
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-6">
        <h2 className="text-xl font-black text-gray-800 flex items-center gap-2 mb-6">
          <ShoppingBag className="text-orange-500" />
          Productos Vendidos
        </h2>
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
          <BarChart3 className="mx-auto mb-3 opacity-50" size={32} />
          <p>No hay ventas registradas hoy para analizar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 safe-bottom max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-black text-gray-800 flex items-center gap-2 mb-2">
        <ShoppingBag className="text-orange-500" />
        Productos Vendidos Hoy
      </h2>

      {/* ── PODIO (ARRIBA EN GRANDE) ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl p-4 text-white shadow-sm">
          <div className="flex items-center gap-1.5 opacity-90 mb-1">
            <Award size={14} />
            <p className="text-[10px] font-bold uppercase tracking-wider">Más Vendido</p>
          </div>
          <p className="font-black text-lg leading-tight">{masVendido?.nombre}</p>
          <p className="text-sm font-bold bg-white/20 inline-block px-2 py-0.5 rounded-lg mt-2">
            {masVendido?.unidades} unidades
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white shadow-sm">
          <div className="flex items-center gap-1.5 opacity-90 mb-1">
            <TrendingUp size={14} />
            <p className="text-[10px] font-bold uppercase tracking-wider">Más Ingresos</p>
          </div>
          <p className="font-black text-lg leading-tight">{masIngresos?.nombre}</p>
          <p className="text-sm font-bold bg-white/20 inline-block px-2 py-0.5 rounded-lg mt-2">
            {formatearPesos(masIngresos?.ingresos)}
          </p>
        </div>
      </div>

      {/* ── TABLA DE DETALLE ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-3 py-3 font-bold">Producto</th>
              <th className="px-2 py-3 font-bold text-center">Unidades</th>
              <th className="px-3 py-3 font-bold text-right">Ingresos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {desglose.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-3 font-semibold text-gray-800 text-xs">{item.nombre}</td>
                <td className="px-2 py-3 text-center">
                  <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md font-bold text-xs">
                    {item.unidades}
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-black text-gray-700 text-xs">
                  {formatearPesos(item.ingresos)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
    </div>
  )
}
