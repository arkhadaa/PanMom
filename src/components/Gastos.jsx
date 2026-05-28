// =============================================
// Gastos.jsx
// Registrar gastos del día (harina, gas, aceite...)
// Simple: descripción + monto. Nada más.
// =============================================

import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, CheckCircle } from 'lucide-react'
import { registrarGasto, listarGastosHoy, eliminarGasto, formatearPesos } from '../services/supabaseClient'

// Atajos rápidos para no tipear siempre lo mismo
const ATAJOS = ['Harina', 'Aceite', 'Margarina', 'Gas', 'Sal', 'Azúcar', 'Levadura', 'Otro']

export default function Gastos({ onGastosChange }) {
  const [gastos, setGastos]           = useState([])
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto]             = useState('')
  const [guardando, setGuardando]     = useState(false)
  const [exito, setExito]             = useState(false)
  const [cargando, setCargando]       = useState(true)

  const cargar = async () => {
    setCargando(true)
    try {
      const data = await listarGastosHoy()
      setGastos(data)
      onGastosChange?.(data)
    } catch (e) { console.error(e) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const totalGastos = gastos.reduce((s, g) => s + (g.monto || 0), 0)

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!descripcion.trim() || !monto || guardando) return
    setGuardando(true)
    try {
      const nuevo = await registrarGasto({ descripcion, monto: Number(monto) })
      const nuevaLista = [nuevo, ...gastos]
      setGastos(nuevaLista)
      onGastosChange?.(nuevaLista)
      setDescripcion('')
      setMonto('')
      setExito(true)
      setTimeout(() => setExito(false), 1800)
    } catch (e) { console.error(e) }
    finally { setGuardando(false) }
  }

  const handleEliminar = async (id) => {
    try {
      await eliminarGasto(id)
      const nuevaLista = gastos.filter(g => g.id !== id)
      setGastos(nuevaLista)
      onGastosChange?.(nuevaLista)
    } catch (e) { console.error(e) }
  }

  return (
    <div className="space-y-4">

      {/* ── Formulario ── */}
      <form onSubmit={handleGuardar} className="card space-y-3">
        <h3 className="font-bold text-gray-700">Anotar gasto de hoy</h3>

        {/* Atajos rápidos */}
        <div className="flex flex-wrap gap-1.5">
          {ATAJOS.map(a => (
            <button
              key={a}
              type="button"
              onClick={() => setDescripcion(a)}
              className={`
                px-3 py-1 rounded-full text-xs font-semibold border transition-all
                ${descripcion === a
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                }
              `}
            >
              {a}
            </button>
          ))}
        </div>

        {/* Descripción */}
        <input
          type="text"
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder="¿En qué se gastó? Ej: Harina 25kg"
          className="input-field"
          maxLength={100}
          required
        />

        {/* Monto */}
        <div className="flex gap-2">
          <input
            type="number"
            value={monto}
            onChange={e => setMonto(e.target.value)}
            placeholder="Monto en pesos  Ej: 15235"
            className="input-field flex-1"
            min={1}
            required
          />
          <button
            type="submit"
            disabled={!descripcion.trim() || !monto || guardando}
            className="btn-primary !px-4 flex-shrink-0"
          >
            {guardando
              ? <Loader2 size={18} className="animate-spin" />
              : exito
              ? <CheckCircle size={18} />
              : <Plus size={18} />
            }
          </button>
        </div>
      </form>

      {/* ── Total del día ── */}
      {gastos.length > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <span className="font-bold text-red-700 text-sm">Total gastos hoy</span>
          <span className="font-extrabold text-red-600 text-lg">{formatearPesos(totalGastos)}</span>
        </div>
      )}

      {/* ── Lista de gastos ── */}
      {cargando && (
        <div className="space-y-2">
          {[1,2].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      )}

      {!cargando && gastos.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          Sin gastos anotados hoy.
        </div>
      )}

      {!cargando && gastos.length > 0 && (
        <div className="space-y-2">
          {gastos.map(g => {
            const hora = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' }).format(new Date(g.fecha_gasto))
            return (
              <div key={g.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 animate-slide-in">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{g.descripcion}</p>
                  <p className="text-xs text-gray-400">{hora}</p>
                </div>
                <span className="font-bold text-red-600 text-sm whitespace-nowrap">
                  − {formatearPesos(g.monto)}
                </span>
                <button
                  onClick={() => handleEliminar(g.id)}
                  className="btn-danger !p-1.5 !rounded-lg flex-shrink-0"
                  title="Eliminar"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
