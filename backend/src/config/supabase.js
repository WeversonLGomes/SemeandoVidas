const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL          = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY     = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE) {
    console.error('❌  Variáveis de ambiente do Supabase ausentes. Verifique o .env');
    process.exit(1);
}

// Cliente público — respeita RLS, usa no contexto de usuário autenticado
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cliente admin — ignora RLS, usado para operações do ESP32/servidor
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = { supabase, supabaseAdmin };
