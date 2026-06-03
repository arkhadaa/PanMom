import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jqvrgecoblizymuuihze.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_BU9GPQqaNtMULNZAuLDQCQ_2gI-3C6A'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function inspect() {
  const { data: pagos } = await supabase.from('pagos_cliente').select('*')
  console.log("=== PAGOS CLIENTE ===")
  console.log(JSON.stringify(pagos, null, 2))

  const { data: pedidos } = await supabase.from('pedidos').select('id, clientes(nombre), monto_pesos, monto_abonado, pagado, metodo_pago, estado, fecha_pedido').order('fecha_pedido', { ascending: false }).limit(10)
  console.log("\n=== ULTIMOS PEDIDOS ===")
  console.log(JSON.stringify(pedidos, null, 2))
}

inspect()
