import { supabase } from './src/services/supabaseClient.js';
async function run() {
  const { data } = await supabase.from('gastos').select('descripcion, fecha_gasto, monto').order('fecha_gasto', { ascending: false }).limit(5);
  console.log(data);
}
run();
