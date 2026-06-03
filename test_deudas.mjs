import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jqvrgecoblizymuuihze.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_BU9GPQqaNtMULNZAuLDQCQ_2gI-3C6A'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
  const [{ data: pedidosTodos, error: e1 }, { data: pagos, error: e2 }] = await Promise.all([
    supabase
      .from('pedidos')
      .select('id, monto_pesos, pagado, fecha_pedido, estado, clientes(id, nombre)')
      .neq('estado', 'anulado')
      .order('fecha_pedido', { ascending: true }),
    supabase
      .from('pagos_cliente')
      .select('*')
      .order('fecha', { ascending: true }),
  ])

  console.log("Pedidos recibidos:", pedidosTodos?.filter(p => p.clientes?.nombre?.toLowerCase().includes('test')))
  console.log("Pagos recibidos:", pagos)
}

run()
