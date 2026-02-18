import { createClient } from "@supabase/supabase-js";

let _client = null;

export async function supabaseAdmin() {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing SUPABASE_URL");
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  _client = createClient(url, key, {
    auth: { persistSession: false },
  });

  return _client;
}
