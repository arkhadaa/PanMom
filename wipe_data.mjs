import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jqvrgecoblizymuuihze.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_BU9GPQqaNtMULNZAuLDQCQ_2gI-3C6A'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function wipe() {
  console.log("Limpiando historial de pagos_cliente...")
  const { error: e1 } = await supabase.from('pagos_cliente').delete().neq('id', -1)
  if (e1) console.error("Error pagos_cliente:", e1)

  console.log("Limpiando pedido_items...")
  const { error: e2 } = await supabase.from('pedido_items').delete().neq('id', -1)
  if (e2) console.error("Error pedido_items:", e2)

  console.log("Limpiando historial de pedidos...")
  const { error: e3 } = await supabase.from('historial').delete().neq('id', -1)
  if (e3) console.error("Error historial:", e3)

  console.log("Limpiando pedidos (deudas de prueba)...")
  const { error: e4 } = await supabase.from('pedidos').delete().neq('id', -1)
  if (e4) console.error("Error pedidos:", e4)

  console.log("Limpiando gastos (opcional, para dejar todo limpio)...")
  const { error: e5 } = await supabase.from('gastos').delete().neq('id', -1)
  if (e5) console.error("Error gastos:", e5)

  console.log("Limpiando retiros (opcional, para dejar todo limpio)...")
  const { error: e6 } = await supabase.from('retiros').delete().neq('id', -1)
  if (e6) console.error("Error retiros:", e6)

  console.log("Limpieza terminada con éxito. Base de datos como nueva.")
}

wipe()
