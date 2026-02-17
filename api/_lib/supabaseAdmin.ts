// api/_lib/supabaseAdmin.ts
let _client: any = null;

export async function supabaseAdmin() {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const { createClient } = await import("@supabase/supabase-js");
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _client;
}
