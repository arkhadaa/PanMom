// =============================================
// Insumos.jsx
// Gestión de ingredientes con precio_compra /
// cantidad_compra → costo_unitario calculado.
// Todo se guarda en unidad base (g, ml, unidad).
// =============================================

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Save, X, Loader2, CheckCircle } from 'lucide-react'
import {
  listarInsumos, crearInsumo, editarInsumo, eliminarInsumo,
  formatearPesos, aBaseUnit, deBaseUnit, formatearCantidad, formatearCostoInsumo,
} from '../services/supabaseClient'

// Unidades que el usuario puede seleccionar al ingresar datos
const UNIDADES_ENTRADA = ['kg', 'g', 'litro', 'ml', 'unidad']

// ─── Formulario crear / editar ────────────────────────────────────────────────
function FormInsumo({ insumo, onGuardar, onCancelar }) {
  // Si editamos, pre-convertir a unidad display amigable
  const inicial = () => {
    if (!insumo) return { nombre: '', unidadEntrada: 'kg', precioCompra: '', cantidadEntrada: '' }
    const { cantidad, unidad } = deBaseUnit(insumo.cantidad_compra, insumo.unidad)
    return {
      nombre:         insumo.nombre,
      unidadEntrada:  unidad,
      precioCompra:   String(insumo.precio_compra),
      cantidadEntrada: String(Number.isInteger(cantidad) ? cantidad : parseFloat(cantidad.toFixed(3))),
    }
  }

  const [form, setForm]       = useState(inicial)
  const [guardando, setGuard] = useState(false)
  const [error, setError]     = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Costo unitario calculado en vivo (en unidad amigable)
  const precio   = Number(form.precioCompra)   || 0
  const cantidad = Number(form.cantidadEntrada) || 0
  const { valor: cantBase, unidad: unidBase } = aBaseUnit(cantidad, form.unidadEntrada)
  const costoBase   = cantBase > 0 ? precio / cantBase : 0
  // Mostrar siempre por la unidad "grande": $/kg o $/litro
  const costoDisplay = (unidBase === 'g' || unidBase === 'ml') ? costoBase * 1000 : costoBase
  const labelCosto   = unidBase === 'g' ? 'kg' : unidBase === 'ml' ? 'litro' : 'unidad'

  const esValido = form.nombre.trim().length >= 2 && precio > 0 && cantidad > 0

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!esValido || guardando) return
    setGuard(true)
    setError(null)
    try {
      const { valor, unidad } = aBaseUnit(Number(form.cantidadEntrada), form.unidadEntrada)
      await onGuardar({
        nombre:          form.nombre.trim(),
        unidad,
        precio_compra:   precio,
        cantidad_compra: valor,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setGuard(false)
    }
  }

  return (
    <form onSubmit={handleGuardar} className="card border-2 border-orange-200 animate-fade-up space-y-4">
      <h4 className="font-bold text-gray-700">{insumo ? 'Editar insumo' : 'Nuevo insumo'}</h4>

      {error && <p className="text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {/* Nombre */}
      <div>
        <label className="input-label">Nombre</label>
        <input
          type="text"
          value={form.nombre}
          onChange={e => set('nombre', e.target.value)}
          placeholder="Ej: Harina"
          className="input-field"
          autoFocus
          required
        />
      </div>

      {/* Precio de compra */}
      <div>
        <label className="input-label">Precio de compra ($)</label>
        <input
          type="number"
          value={form.precioCompra}
          onChange={e => set('precioCompra', e.target.value)}
          placeholder="Ej: 15240"
          className="input-field"
          min={1}
          required
        />
      </div>

      {/* Cantidad comprada + unidad */}
      <div>
        <label className="input-label">Cantidad que compraste</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={form.cantidadEntrada}
            onChange={e => set('cantidadEntrada', e.target.value)}
            placeholder="Ej: 25"
            className="input-field flex-1"
            min={0.001}
            step="any"
            required
          />
          <select
            value={form.unidadEntrada}
            onChange={e => set('unidadEntrada', e.target.value)}
            className="input-field w-28 flex-shrink-0"
          >
            {UNIDADES_ENTRADA.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Costo calculado en vivo */}
      {precio > 0 && cantidad > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
          <span className="text-amber-700">Costo calculado: </span>
          <strong className="text-amber-900 text-base">
            {formatearPesos(Math.round(costoDisplay))}/{labelCosto}
          </strong>
        </div>
      )}

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

// ─── Tarjeta de insumo ────────────────────────────────────────────────────────
function TarjetaInsumo({ insumo, onEditar, onEliminar }) {
  const [eliminando, setEliminando] = useState(false)

  const handleEliminar = async () => {
    if (!confirm(`¿Eliminar "${insumo.nombre}"?`)) return
    setEliminando(true)
    try { await onEliminar(insumo.id) }
    finally { setEliminando(false) }
  }

  return (
    <div className="card animate-slide-in flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-gray-800">{insumo.nombre}</span>
          </div>
          {/* Precio de Referencia Teórico */}
          <p className="text-xs text-gray-400">
            Referencia: {formatearPesos(insumo.precio_compra)} por {formatearCantidad(insumo.cantidad_compra, insumo.unidad)}
          </p>
          {/* Costo unitario calculado */}
          <p className="text-sm font-bold text-green-700 mt-0.5">
            {formatearCostoInsumo(insumo)}
          </p>
        </div>

        <div className="flex flex-col gap-1.5 flex-shrink-0 items-end">
          <div className="flex gap-1.5 mt-1">
            <button onClick={() => onEditar(insumo)} className="btn-orange !p-2 !rounded-lg" title="Editar Precio">
              <Pencil size={13} /> Editar
            </button>
            <button onClick={handleEliminar} disabled={eliminando} className="btn-secondary !p-2 !rounded-lg hover:!text-red-600" title="Eliminar">
              {eliminando ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Pantalla principal ────────────────────────────────────────────────────────
export default function Insumos() {
  const [insumos, setInsumos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [exito, setExito] = useState(false)

  useEffect(() => {
    listarInsumos()
      .then(setInsumos)
      .catch(console.error)
      .finally(() => setCargando(false))
  }, [])

  const handleCrear = async (i) => {
    const nuevo = await crearInsumo(i)
    setInsumos(prev => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    setMostrarForm(false)
    setExito(true)
    setTimeout(() => setExito(false), 2500)
  }

  const handleEditar = async (i) => {
    const editado = await editarInsumo(editando.id, i)
    setInsumos(prev => prev.map(item => item.id === editando.id ? editado : item))
    setEditando(null)
    setExito(true)
    setTimeout(() => setExito(false), 2500)
  }

  const handleEliminar = async (id) => {
    await eliminarInsumo(id)
    setInsumos(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="p-4 safe-bottom max-w-lg mx-auto">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Precios Base (Insumos)</h2>
          <p className="text-sm text-gray-500">Configura el costo teórico de tus ingredientes</p>
        </div>
        {!mostrarForm && !editando && (
          <button onClick={() => setMostrarForm(true)} className="btn-primary !py-2.5">
            <Plus size={16} /> Agregar
          </button>
        )}
      </div>

      <div className="bg-blue-50 text-blue-800 p-3 rounded-xl mb-4 text-xs font-medium border border-blue-100">
        ℹ️ <strong>Nota:</strong> Esta sección es puramente teórica para calcular el margen de tus recetas. Las compras reales del día a día deben anotarse en la pestaña <strong>Inicio &gt; Registrar Gasto</strong>.
      </div>

      {exito && (
        <div className="mb-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 animate-fade-up">
          <CheckCircle size={16} className="text-green-500" />
          <span className="text-sm font-semibold text-green-800">Guardado ✓</span>
        </div>
      )}

      {mostrarForm && (
        <div className="mb-3">
          <FormInsumo onGuardar={handleCrear} onCancelar={() => setMostrarForm(false)} />
        </div>
      )}

      {cargando && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 w-full rounded-xl" />)}
        </div>
      )}

      {!cargando && insumos.length === 0 && !mostrarForm && (
        <div className="card text-center py-10">
          <div className="text-5xl mb-3">🧂</div>
          <h3 className="font-bold text-gray-700 mb-1">Sin insumos aún</h3>
          <p className="text-sm text-gray-400 mb-4">
            Agrega los ingredientes con un precio de referencia para que el sistema calcule el costo de tus recetas.
          </p>
          <button onClick={() => setMostrarForm(true)} className="btn-primary mx-auto">
            <Plus size={16} /> Agregar primer insumo
          </button>
        </div>
      )}

      {!cargando && insumos.length > 0 && (
        <div className="space-y-2">
          {insumos.map(insumo => {
            if (editando?.id === insumo.id) {
              return (
                <div key={insumo.id} className="mb-2">
                  <FormInsumo insumo={insumo} onGuardar={handleEditar} onCancelar={() => setEditando(null)} />
                </div>
              )
            }
            return (
              <TarjetaInsumo
                key={insumo.id}
                insumo={insumo}
                onEditar={setEditando}
                onEliminar={handleEliminar}
              />
            )
          })}
        </div>
      )}
      {!cargando && insumos.length > 0 && (
        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <p className="text-xs text-blue-700">
            <strong>Tip:</strong> Ve a <strong>Recetas</strong> para configurar cuánto usa cada receta por carga.
          </p>
        </div>
      )}
    </div>
  )
}
