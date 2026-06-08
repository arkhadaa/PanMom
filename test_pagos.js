import { supabase } from './src/services/supabase.js';

async function test() {
  const { data } = await supabase.from('pagos_cliente').select('*, pedidos(fecha_pedido)').limit(5);
  console.log(JSON.stringify(data, null, 2));
}
test();
