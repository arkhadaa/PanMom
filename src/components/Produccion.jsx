// =============================================
// Produccion.jsx
// Pantalla ultra-simple para registrar cargas.
// El usuario solo selecciona receta + cargas → listo.
// =============================================

import { useState, useEffect } from 'react'
import { Loader2, Trash2, ChefHat, CheckCircle } from 'lucide-react'
import {
  listarRecetas,
  registrarProduccion, listarProduccionHoy, eliminarProduccion,
  calcularCostoReceta, calcularResumenProduccion,
  formatearPesos,
} from '../services/supabaseClient'

// ─── Registro de producción del día ──────────────────────────────────────────
function ListaProduccionHoy({ produccion, onEliminar }) {
  if (produccion.length === 0) return null

  const resumen = calcularResumenProduccion(produccion)

  return (
    <div className="mt-6">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
        Producción de hoy
      </p>

      <div className="space-y-2 mb-4">
        {produccion.map(p => {
          const receta = p.recetas
          const panes = p.cargas * (receta?.panes_por_carga || 0)
          return (
            <div key={p.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{receta?.nombre}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {p.cargas} carga{p.cargas !== 1 ? 's' : ''} · {panes} panes estimados
                </p>
              </div>
              <button
                onClick={() => onEliminar(p.id)}
                className="btn-danger !p-1.5 !rounded-lg flex-shrink-0"
                title="Eliminar"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Totales del día */}
      <div className="card bg-gradient-to-br from-amber-500 to-orange-600 text-white">
        <p className="text-xs font-bold opacity-80 uppercase tracking-wide mb-3">
          📊 Resumen del día
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs opacity-70">Total cargas</p>
            <p className="text-2xl font-extrabold">{resumen.totalCargas}</p>
          </div>
          <div>
            <p className="text-xs opacity-70">Panes estimados</p>
            <p className="text-2xl font-extrabold">{resumen.totalPanes}</p>
          </div>
          <div>
            <p className="text-xs opacity-70">Costo producción</p>
            <p className="text-lg font-bold">{formatearPesos(resumen.totalCosto)}</p>
          </div>
          <div>
            <p className="text-xs opacity-70">Ingreso estimado</p>
            <p className="text-lg font-bold">{formatearPesos(resumen.totalIngreso)}</p>
          </div>
          <div>
            <p className="text-xs opacity-70">Ganancia bruta</p>
            <p className="text-lg font-bold">{formatearPesos(resumen.ganancia)}</p>
          </div>
          <div>
            <p className="text-xs opacity-70">Margen</p>
            <p className="text-lg font-bold">{resumen.margen}%</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Pantalla principal ────────────────────────────────────────────────────────
export default function Produccion({ onProduccionRegistrada }) {
  const [recetas, setRecetas]       = useState([])
  const [produccion, setProduccion] = useState([])
  const [cargando, setCargando]     = useState(true)

  // Form
  const [recetaId, setRecetaId] = useState('')
  const [cargasInput, setCargasInput] = useState(1)
  const [modoInput, setModoInput] = useState('carga') // 'carga' o 'unidad'
  const [guardando, setGuard]   = useState(false)
  const [exito, setExito]       = useState(false)

  const cargar = async () => {
    setCargando(true)
    try {
      const [r, p] = await Promise.all([listarRecetas(), listarProduccionHoy()])
      setRecetas(r)
      setProduccion(p)
      if (r.length > 0 && !recetaId) setRecetaId(String(r[0].id))
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  // Receta seleccionada + preview de costos
  const recetaSel = recetas.find(r => r.id === Number(recetaId))
  const panesPorCarga = recetaSel?.panes_por_carga || 1
  
  // Calcular las cargas reales que se enviarán a BD
  const cargasReales = modoInput === 'unidad' 
    ? (cargasInput / panesPorCarga) 
    : cargasInput

  const preview   = recetaSel ? calcularCostoReceta(recetaSel) : null
  const panesEst  = recetaSel ? (modoInput === 'unidad' ? cargasInput : cargasInput * panesPorCarga) : 0
  const costoEst  = preview   ? cargasReales * preview.costoCarga        : 0
  const ingresoEst = preview  ? cargasReales * preview.ingresoCarga      : 0

  const handleRegistrar = async () => {
    if (!recetaId || cargasInput < 1 || guardando) return
    setGuard(true)
    try {
      await registrarProduccion({ receta_id: Number(recetaId), cargas: cargasReales })
      setCargasInput(1)
      setModoInput('carga')
      setExito(true)
      setTimeout(() => setExito(false), 2500)
      const [p] = await Promise.all([listarProduccionHoy()])
      setProduccion(p)
      onProduccionRegistrada?.()
    } catch (err) {
      console.error(err)
    } finally {
      setGuard(false)
    }
  }

  const handleEliminar = async (id) => {
    await eliminarProduccion(id)
    const p = await listarProduccionHoy()
    setProduccion(p)
    onProduccionRegistrada?.()
  }

  // ── Ajustar cargas ──
  const incrementar = () => setCargasInput(v => v + 1)
  const decrementar = () => setCargasInput(v => Math.max(1, v - 1))

  if (cargando) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 size={28} className="animate-spin text-orange-400" />
      </div>
    )
  }

  if (recetas.length === 0) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="card text-center py-10">
          <div className="text-5xl mb-3">📋</div>
          <h3 className="font-bold text-gray-700 mb-1">Sin recetas configuradas</h3>
          <p className="text-sm text-gray-400">Ve a <strong>Costos → Recetas</strong> para configurar tu receta base.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 safe-bottom max-w-lg mx-auto">
      {/* Título */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-800">Producción</h2>
        <p className="text-sm text-gray-500">Registra las cargas horneadas hoy</p>
      </div>

      {exito && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 animate-fade-up">
          <CheckCircle size={18} className="text-green-500" />
          <span className="text-sm font-semibold text-green-800">¡Producción registrada!</span>
        </div>
      )}

      {/* Formulario principal */}
      <div className="card space-y-5">

        {/* Selector de receta */}
        <div>
          <label className="input-label text-sm font-bold text-gray-600 uppercase tracking-wide">
            Receta
          </label>
          <select
            value={recetaId}
            onChange={e => setRecetaId(e.target.value)}
            className="input-field !py-3.5 text-base font-semibold"
          >
            {recetas.map(r => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        </div>

        {/* Selector de unidad de medida */}
        <div>
          <label className="input-label text-sm font-bold text-gray-600 uppercase tracking-wide flex justify-between">
            <span>Cantidad a registrar</span>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setModoInput('carga')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${modoInput === 'carga' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}
              >
                Por Carga
              </button>
              <button
                type="button"
                onClick={() => setModoInput('unidad')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${modoInput === 'unidad' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}
              >
                Por Unidad
              </button>
            </div>
          </label>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={decrementar}
              className="w-14 h-14 rounded-2xl border-2 border-gray-200 bg-gray-50 flex items-center justify-center text-2xl font-bold text-gray-600 active:scale-95 transition-all flex-shrink-0"
            >
              −
            </button>
            <div className="flex-1 text-center">
              <input
                type="number"
                value={cargasInput}
                onChange={e => setCargasInput(Number(e.target.value))}
                className="w-full text-5xl font-extrabold text-orange-500 text-center bg-transparent focus:outline-none"
                min={1}
              />
              <p className="text-xs text-gray-400 mt-1">
                {modoInput === 'carga' ? `carga${cargasInput !== 1 ? 's' : ''}` : `unidad${cargasInput !== 1 ? 'es' : ''}`}
              </p>
            </div>
            <button
              onClick={incrementar}
              className="w-14 h-14 rounded-2xl border-2 border-orange-300 bg-orange-50 flex items-center justify-center text-2xl font-bold text-orange-500 active:scale-95 transition-all flex-shrink-0"
            >
              +
            </button>
          </div>
        </div>

        {/* Preview automático */}
        {recetaSel && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-amber-700">🍞 Unidades estimadas</span>
              <strong className="text-amber-900">{panesEst}</strong>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-amber-700">💸 Costo producción</span>
              <strong className="text-amber-900">{formatearPesos(Math.round(costoEst))}</strong>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-amber-700">💰 Ingreso estimado</span>
              <strong className="text-green-700">{formatearPesos(Math.round(ingresoEst))}</strong>
            </div>
          </div>
        )}

        {/* Botón registrar */}
        <button
          onClick={handleRegistrar}
          disabled={!recetaId || cargasInput < 1 || guardando}
          className="btn-primary w-full !py-4 text-base"
        >
          {guardando
            ? <><Loader2 size={20} className="animate-spin" /> Registrando...</>
            : <><ChefHat size={20} /> Registrar Producción</>
          }
        </button>
      </div>

      {/* Lista + resumen del día */}
      <ListaProduccionHoy produccion={produccion} onEliminar={handleEliminar} />
    </div>
  )
}
