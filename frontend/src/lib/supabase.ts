import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createClient() {
    return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Singleton para uso em componentes client
let _client: ReturnType<typeof createClient> | null = null;
export function getSupabase() {
    if (!_client) _client = createClient();
    return _client;
}
