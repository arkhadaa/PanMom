// =============================================
// seed.js
// Datos iniciales automáticos. Se llama una vez
// al arrancar la app. Es idempotente: si los datos
// ya existen no los duplica.
// =============================================

import { supabase } from './supabase'

export async function seedDatosIniciales() {
  try {

    // ── 1. Insumos base ────────────────────────────────────────────────────
    const INSUMOS_BASE = [
      { nombre: 'Harina',    unidad: 'g', precio_compra: 15240, cantidad_compra: 25000 },
      { nombre: 'Margarina', unidad: 'g', precio_compra: 2000,  cantidad_compra: 1000  },
      { nombre: 'Levadura',  unidad: 'g', precio_compra: 2000,  cantidad_compra: 500   },
      { nombre: 'Sal',       unidad: 'g', precio_compra: 600,   cantidad_compra: 1000  },
    ]

    const { data: existentes } = await supabase.from('insumos').select('*')
    const lista = existentes || []

    const idsInsumos = {}
    for (const base of INSUMOS_BASE) {
      const encontrado = lista.find(i => i.nombre.toLowerCase() === base.nombre.toLowerCase())
      if (encontrado) {
        // Actualizar si el precio está vacío (migración desde esquema anterior)
        if (!encontrado.precio_compra || encontrado.precio_compra === 0) {
          await supabase.from('insumos')
            .update({ precio_compra: base.precio_compra, cantidad_compra: base.cantidad_compra, unidad: base.unidad })
            .eq('id', encontrado.id)
        }
        idsInsumos[base.nombre] = encontrado.id
      } else {
        const { data: nuevo } = await supabase.from('insumos').insert(base).select().single()
        if (nuevo) idsInsumos[base.nombre] = nuevo.id
      }
    }

    // ── 2. Receta "Pan corriente" ──────────────────────────────────────────
    const { data: recetasExistentes } = await supabase.from('recetas').select('*')
    let recetaId = recetasExistentes?.find(r => r.nombre.toLowerCase().includes('pan corriente'))?.id

    if (!recetaId) {
      const { data: nueva } = await supabase
        .from('recetas')
        .insert({ nombre: 'Pan corriente', panes_por_carga: 23, precio_venta: 300 })
        .select().single()
      recetaId = nueva?.id
    }

    if (!recetaId) return

    // ── 3. Ingredientes de la receta ───────────────────────────────────────
    const { data: ingExistentes } = await supabase
      .from('receta_ingredientes').select('insumo_id').eq('receta_id', recetaId)
    const idsEnReceta = new Set((ingExistentes || []).map(r => r.insumo_id))

    const ingredientes = [
      { nombre: 'Harina',    cantidad: 1500 },
      { nombre: 'Margarina', cantidad: 220  },
      { nombre: 'Levadura',  cantidad: 30   },
      { nombre: 'Sal',       cantidad: 30   },
    ]
    for (const ing of ingredientes) {
      const insumoId = idsInsumos[ing.nombre]
      if (insumoId && !idsEnReceta.has(insumoId)) {
        await supabase.from('receta_ingredientes').insert({
          receta_id: recetaId, insumo_id: insumoId, cantidad: ing.cantidad,
        })
      }
    }

    // ── 4. Catálogo de productos ───────────────────────────────────────────
    const PRODUCTOS_BASE = [
      { nombre: 'Pan corriente', precio_venta: 300,  tiene_receta: true  },
      { nombre: 'Oferta 7x2000', precio_venta: 2000, tiene_receta: true, cantidad_panes: 7 },
      { nombre: 'Pan de huevo',  precio_venta: 1000, tiene_receta: false },
      { nombre: 'Consomé',       precio_venta: 1000, tiene_receta: false },
      { nombre: 'Té',            precio_venta: 500,  tiene_receta: false },
      { nombre: 'Café',          precio_venta: 700,  tiene_receta: false },
    ]
    const { data: prodsExistentes } = await supabase.from('productos').select('nombre')
    const nombresExistentes = new Set((prodsExistentes || []).map(p => p.nombre.toLowerCase()))

    for (const prod of PRODUCTOS_BASE) {
      if (!nombresExistentes.has(prod.nombre.toLowerCase())) {
        await supabase.from('productos').insert(prod)
      }
    }

    // Vincular todos los productos que consumen un pan de la producción.
    // Excluye bebidas (té, café, consomé) — el resto son pan o sandwich con pan base.
    await supabase.from('productos')
      .update({ receta_id: recetaId })
      .not('nombre', 'ilike', '%té%')
      .not('nombre', 'ilike', '%cafe%')
      .not('nombre', 'ilike', '%café%')
      .not('nombre', 'ilike', '%consom%')
      .is('receta_id', null)

    // Oferta = 7 panes físicos por unidad vendida
    await supabase.from('productos')
      .update({ cantidad_panes: 7 })
      .ilike('nombre', '%oferta%')
      .or('cantidad_panes.is.null,cantidad_panes.eq.1')

    // ── 5. Usuarios Base (PIN) ──────────────────────────────────────────────
    const { data: usuariosExistentes } = await supabase.from('usuarios_pin').select('id')
    if (!usuariosExistentes || usuariosExistentes.length === 0) {
      await supabase.from('usuarios_pin').insert([
        { nombre: 'Dueño', pin: '1234', rol: 'superadmin' },
        { nombre: 'Caja',  pin: '1111', rol: 'vendedor' },
        { nombre: 'Vendedor', pin: '2222', rol: 'vendedor' }
      ])
    }

  } catch (err) {
    console.warn('Seed:', err.message)
  }
}
