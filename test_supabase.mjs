import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://jqvrgecoblizymuuihze.supabase.co', 'sb_publishable_BU9GPQqaNtMULNZAuLDQCQ_2gI-3C6A')

async function run() {
  try {
    const [{ data: pedidosImpagos, error: e1 }, { data: pagos, error: e2 }] = await Promise.all([
      supabase
        .from('pedidos')
        .select('id, estado, pagado, monto_pesos, fecha_pedido, clientes(id, nombre), pedido_items(cantidad, productos(nombre))')
        .eq('pagado', false)
        .in('estado', ['pendiente', 'produciendo', 'listo', 'entregado'])
        .order('fecha_pedido', { ascending: true }),
      supabase
        .from('pagos_cliente')
        .select('*')
        .order('fecha', { ascending: true }),
    ])

    console.log("Error pedidos:", e1)
    console.log("Error pagos:", e2)
    console.log("Pedidos impagos:", pedidosImpagos)
    console.log("Pagos:", pagos)
  } catch (err) {
    console.error("Catch error:", err)
  }
}

run()
