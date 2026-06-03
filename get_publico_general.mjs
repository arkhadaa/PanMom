import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jqvrgecoblizymuuihze.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_BU9GPQqaNtMULNZAuLDQCQ_2gI-3C6A'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function run() {
  const { data, error } = await supabase.from('clientes').select('id').eq('nombre', 'Público General').single()
  if (error) {
    console.error("Error fetching Publico General:", error)
  } else {
    console.log("PUBLICO_GENERAL_ID=" + data.id)
  }
}

run()
