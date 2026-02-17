import { createClient } from "@supabase/supabase-js";

let _sb = null;

export async function supabaseAdmin() {
  if (_sb) return _sb;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("MISSING_SUPABASE_URL");
  if (!key) throw new Error("MISSING_SUPABASE_SERVICE_ROLE_KEY");

  _sb = createClient(url, key, {
    auth: { persistSession: false },
    global: {
      headers: { "X-Client-Info": "one-eleven-api" }
    }
  });

  return _sb;
}
