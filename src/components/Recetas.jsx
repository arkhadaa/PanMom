// =============================================
// Recetas.jsx
// Recetas dinámicas con ingredientes, cargas
// y precio de venta para calcular márgenes.
// =============================================

import { useState, useEffect } from 'react'
import {
  Plus, Pencil, Trash2, Save, X, Loader2,
  ChevronDown, ChevronUp, RefreshCw, CheckCircle,
} from 'lucide-react'
import {
  listarInsumos, listarRecetas,
  crearReceta, editarReceta, eliminarReceta,
  agregarIngrediente, eliminarIngrediente,
  calcularCostoReceta,
  formatearPesos, aBaseUnit, formatearCantidad,
  UNIDADES_POR_BASE,
} from '../services/supabaseClient'

// ─── Formulario crear / editar receta ─────────────────────────────────────────
function FormReceta({ receta, onGuardar, onCancelar }) {
  const [form, setForm] = useState({
    nombre:         receta?.nombre          || '',
    panes_por_carga: receta?.panes_por_carga || '',
    precio_venta:   receta?.precio_venta    || '',
  })
  const [guardando, setGuard] = useState(false)
  const [error, setError]     = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const esValido = form.nombre.trim().length >= 2
    && Number(form.panes_por_carga) >= 1
    && Number(form.precio_venta)    >= 0

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!esValido || guardando) return
    setGuard(true)
    setError(null)
    try {
      await onGuardar({
        nombre:          form.nombre.trim(),
        panes_por_carga: Number(form.panes_por_carga),
        precio_venta:    Number(form.precio_venta),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setGuard(false)
    }
  }

  return (
    <form onSubmit={handleGuardar} className="card border-2 border-orange-200 animate-fade-up space-y-3">
      <h4 className="font-bold text-gray-700">{receta ? 'Editar receta' : 'Nueva receta'}</h4>

      {error && <p className="text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div>
        <label className="input-label">Nombre de la receta</label>
        <input
          type="text"
          value={form.nombre}
          onChange={e => set('nombre', e.target.value)}
          placeholder="Ej: Pan corriente"
          className="input-field"
          autoFocus
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="input-label">Unidades por carga</label>
          <input
            type="number"
            value={form.panes_por_carga}
            onChange={e => set('panes_por_carga', e.target.value)}
            placeholder="Ej: 23"
            className="input-field"
            min={1}
            required
          />
        </div>
        <div>
          <label className="input-label">Precio venta ($)</label>
          <input
            type="number"
            value={form.precio_venta}
            onChange={e => set('precio_venta', e.target.value)}
            placeholder="Ej: 300"
            className="input-field"
            min={0}
            required
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancelar} className="btn-secondary flex-1" disabled={guardando}>
          <X size={15} /> Cancelar
        </button>
        <button type="submit" disabled={!esValido || guardando} className="btn-primary flex-1">
          {guardando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

// ─── Fila de ingrediente dentro de una receta ─────────────────────────────────
function FilaIngrediente({ ri, onEliminar }) {
  const [eliminando, setEliminando] = useState(false)
  const ins = ri.insumos

  // Costo de este ingrediente en la receta
  const costoLinea = ins?.cantidad_compra > 0
    ? (ins.precio_compra / ins.cantidad_compra) * ri.cantidad
    : 0

  const handleEliminar = async () => {
    setEliminando(true)
    try { await onEliminar(ri.id) }
    finally { setEliminando(false) }
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-gray-700 text-sm truncate">{ins?.nombre}</span>
          <span className="text-xs font-bold text-green-700 whitespace-nowrap">
            {formatearPesos(Math.round(costoLinea))}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatearCantidad(ri.cantidad, ins?.unidad)}
        </p>
      </div>
      <button
        onClick={handleEliminar}
        disabled={eliminando}
        className="btn-danger !p-1.5 !rounded-lg flex-shrink-0"
      >
        {eliminando ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
      </button>
    </div>
  )
}

// ─── Formulario agregar ingrediente ───────────────────────────────────────────
function FormIngrediente({ receta, insumos, onGuardar }) {
  const idsEnReceta   = new Set((receta.receta_ingredientes || []).map(r => r.insumo_id))
  const disponibles   = insumos.filter(i => !idsEnReceta.has(i.id))
  const [insumoId, setInsumoId]   = useState('')
  const [cantidad, setCantidad]   = useState('')
  const [unidadEnt, setUnidadEnt] = useState('g')
  const [guardando, setGuard]     = useState(false)

  const insumoSel = insumos.find(i => i.id === Number(insumoId))

  // Unidades disponibles para el insumo seleccionado
  const unidadesValidas = insumoSel ? (UNIDADES_POR_BASE[insumoSel.unidad] || ['unidad']) : ['g']

  // Resetear unidad cuando cambia insumo
  const handleInsumoChange = (id) => {
    setInsumoId(id)
    setCantidad('')
    const ins = insumos.find(i => i.id === Number(id))
    if (ins) setUnidadEnt((UNIDADES_POR_BASE[ins.unidad] || ['unidad'])[0])
  }

  // Costo live
  const cantBase = insumoSel
    ? aBaseUnit(Number(cantidad) || 0, unidadEnt).valor
    : 0
  const costoLive = insumoSel && insumoSel.cantidad_compra > 0
    ? (insumoSel.precio_compra / insumoSel.cantidad_compra) * cantBase
    : 0

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!insumoId || !cantidad || guardando) return
    setGuard(true)
    try {
      const { valor } = aBaseUnit(Number(cantidad), unidadEnt)
      await onGuardar({ receta_id: receta.id, insumo_id: Number(insumoId), cantidad: valor })
      setInsumoId('')
      setCantidad('')
    } finally {
      setGuard(false)
    }
  }

  if (disponibles.length === 0) {
    return (
      <p className="text-center text-xs text-gray-400 py-3 bg-gray-50 rounded-xl">
        Todos los insumos ya están en la receta.
      </p>
    )
  }

  return (
    <form onSubmit={handleGuardar} className="space-y-2">
      {/* Selector de insumo */}
      <select
        value={insumoId}
        onChange={e => handleInsumoChange(e.target.value)}
        className="input-field !py-2 text-sm"
        required
      >
        <option value="">Selecciona un ingrediente...</option>
        {disponibles.map(i => (
          <option key={i.id} value={i.id}>{i.nombre}</option>
        ))}
      </select>

      {/* Cantidad + unidad */}
      {insumoSel && (
        <>
          <div className="flex gap-2">
            <input
              type="number"
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              placeholder="Cantidad"
              className="input-field flex-1 !py-2 text-sm"
              min={0.001}
              step="any"
              required
            />
            <select
              value={unidadEnt}
              onChange={e => setUnidadEnt(e.target.value)}
              className="input-field w-24 flex-shrink-0 !py-2 text-sm"
            >
              {unidadesValidas.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <button type="submit" disabled={!cantidad || guardando} className="btn-primary !py-2 !px-4 flex-shrink-0 text-sm">
              {guardando ? <Loader2 size={15} className="animate-spin" /> : <><Plus size={14} className="mr-1 inline" /> Añadir</>}
            </button>
          </div>

          {cantidad > 0 && (
            <p className="text-xs text-orange-700 bg-orange-50 rounded-lg px-3 py-1.5">
              Costo de este ingrediente: <strong>{formatearPesos(Math.round(costoLive))}</strong>
            </p>
          )}
        </>
      )}
    </form>
  )
}

// ─── Tarjeta de receta expandible ─────────────────────────────────────────────
function TarjetaReceta({ receta, insumos, onActualizar, onEliminar }) {
  const [expandida, setExpandida] = useState(false)
  const [editando, setEditando]   = useState(false)
  const [eliminando, setEliminando] = useState(false)

  const costos = calcularCostoReceta(receta)

  const handleEliminar = async () => {
    if (!confirm(`¿Eliminar receta "${receta.nombre}"? Esto también borrará sus ingredientes.`)) return
    setEliminando(true)
    try { await onEliminar(receta.id) }
    finally { setEliminando(false) }
  }

  const handleAgregarIng = async (datos) => {
    await agregarIngrediente(datos)
    onActualizar()
  }

  const handleEliminarIng = async (id) => {
    await eliminarIngrediente(id)
    onActualizar()
  }

  const handleGuardarEdicion = async (datos) => {
    await editarReceta(receta.id, datos)
    setEditando(false)
    onActualizar()
  }

  if (editando) {
    return (
      <FormReceta
        receta={receta}
        onGuardar={handleGuardarEdicion}
        onCancelar={() => setEditando(false)}
      />
    )
  }

  return (
    <div className="card animate-fade-up">
      {/* Header de la tarjeta */}
      <div
        className="flex items-center justify-between gap-3 cursor-pointer"
        onClick={() => setExpandida(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-base">{receta.nombre}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            <span className="text-xs text-gray-500">{receta.panes_por_carga} unid/carga</span>
            <span className="text-xs text-green-700 font-semibold">
              venta {formatearPesos(receta.precio_venta)}/u
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Resumen costo / ganancia */}
          <div className="text-right mr-1">
            <p className="text-xs text-gray-500">costo/u</p>
            <p className="text-sm font-extrabold text-purple-700">
              {formatearPesos(costos.costoPorUnidad)}
            </p>
          </div>
          {expandida ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </div>
      </div>

      {/* Contenido expandido */}
      {expandida && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          {/* Métricas de la receta */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-purple-50 rounded-xl px-3 py-2.5 text-center">
              <p className="text-xs text-purple-600 font-semibold">Costo / carga</p>
              <p className="text-lg font-extrabold text-purple-800">{formatearPesos(costos.costoCarga)}</p>
            </div>
            <div className="bg-green-50 rounded-xl px-3 py-2.5 text-center">
              <p className="text-xs text-green-600 font-semibold">Ingreso / carga</p>
              <p className="text-lg font-extrabold text-green-800">{formatearPesos(costos.ingresoCarga)}</p>
            </div>
            <div className={`rounded-xl px-3 py-2.5 text-center ${costos.gananciaUnitaria >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <p className={`text-xs font-semibold ${costos.gananciaUnitaria >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Ganancia / u</p>
              <p className={`text-lg font-extrabold ${costos.gananciaUnitaria >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                {formatearPesos(costos.gananciaUnitaria)}
              </p>
            </div>
            <div className={`rounded-xl px-3 py-2.5 text-center ${costos.margen >= 30 ? 'bg-teal-50' : costos.margen >= 15 ? 'bg-amber-50' : 'bg-red-50'}`}>
              <p className={`text-xs font-semibold ${costos.margen >= 30 ? 'text-teal-600' : costos.margen >= 15 ? 'text-amber-600' : 'text-red-600'}`}>Margen</p>
              <p className={`text-lg font-extrabold ${costos.margen >= 30 ? 'text-teal-800' : costos.margen >= 15 ? 'text-amber-800' : 'text-red-800'}`}>
                {costos.margen}%
              </p>
            </div>
          </div>

          {/* Ingredientes */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Ingredientes por carga
            </p>
            {receta.receta_ingredientes?.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3 bg-gray-50 rounded-xl">Sin ingredientes aún.</p>
            ) : (
              <div className="space-y-1.5">
                {receta.receta_ingredientes?.map(ri => (
                  <FilaIngrediente key={ri.id} ri={ri} onEliminar={handleEliminarIng} />
                ))}
              </div>
            )}
          </div>

          {/* Agregar ingrediente */}
          {insumos.length > 0 && (
            <div className="border border-dashed border-gray-200 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Agregar ingrediente
              </p>
              <FormIngrediente receta={receta} insumos={insumos} onGuardar={handleAgregarIng} />
            </div>
          )}

          {/* Acciones editar / eliminar */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setEditando(true)}
              className="btn-secondary flex-1 !py-2.5 text-sm"
            >
              <Pencil size={14} /> Editar receta
            </button>
            <button
              onClick={handleEliminar}
              disabled={eliminando}
              className="btn-danger !py-2.5 !px-4"
            >
              {eliminando ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Pantalla principal ────────────────────────────────────────────────────────
export default function Recetas({ onCostosActualizados }) {
  const [recetas, setRecetas]         = useState([])
  const [insumos, setInsumos]         = useState([])
  const [cargando, setCargando]       = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [exito, setExito]             = useState(false)

  const cargar = async () => {
    setCargando(true)
    try {
      const [r, i] = await Promise.all([listarRecetas(), listarInsumos()])
      setRecetas(r)
      setInsumos(i)
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const handleCrearReceta = async (datos) => {
    await crearReceta(datos)
    setMostrarForm(false)
    setExito(true)
    setTimeout(() => setExito(false), 2000)
    await cargar()
    onCostosActualizados?.()
  }

  const handleActualizar = async () => {
    await cargar()
    onCostosActualizados?.()
  }

  const handleEliminarReceta = async (id) => {
    await eliminarReceta(id)
    await cargar()
    onCostosActualizados?.()
  }

  return (
    <div className="p-4 safe-bottom max-w-lg mx-auto">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Recetas</h2>
          <p className="text-sm text-gray-500">Costos y márgenes por carga</p>
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} disabled={cargando} className="btn-secondary !p-2.5">
            <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
          </button>
          {!mostrarForm && (
            <button onClick={() => setMostrarForm(true)} className="btn-primary !py-2.5">
              <Plus size={16} /> Nueva
            </button>
          )}
        </div>
      </div>

      {exito && (
        <div className="mb-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 animate-fade-up">
          <CheckCircle size={16} className="text-green-500" />
          <span className="text-sm font-semibold text-green-800">Receta guardada ✓</span>
        </div>
      )}

      {mostrarForm && (
        <div className="mb-4">
          <FormReceta onGuardar={handleCrearReceta} onCancelar={() => setMostrarForm(false)} />
        </div>
      )}

      {/* Sin insumos → advertencia */}
      {!cargando && insumos.length === 0 && (
        <div className="card text-center py-6 mb-4 border border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">
            Primero agrega insumos en la pestaña <strong>Insumos</strong>.
          </p>
        </div>
      )}

      {cargando && (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      )}

      {!cargando && recetas.length === 0 && !mostrarForm && (
        <div className="card text-center py-10">
          <div className="text-5xl mb-3">📋</div>
          <h3 className="font-bold text-gray-700 mb-1">Sin recetas aún</h3>
          <p className="text-sm text-gray-400 mb-4">
            Crea tu primera receta con los ingredientes por carga y el precio de venta.
          </p>
          <button onClick={() => setMostrarForm(true)} className="btn-primary mx-auto">
            <Plus size={16} /> Crear primera receta
          </button>
        </div>
      )}

      {!cargando && recetas.length > 0 && (
        <div className="space-y-3">
          {recetas.map(r => (
            <TarjetaReceta
              key={r.id}
              receta={r}
              insumos={insumos}
              onActualizar={handleActualizar}
              onEliminar={handleEliminarReceta}
            />
          ))}
        </div>
      )}
    </div>
  )
}
