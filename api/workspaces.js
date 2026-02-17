import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  // se não tiver token ainda, devolve vazio (não quebra UI)
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();

  // tenta workspaces; se não existir, tenta clients
  const a = await sb.from("workspaces").select("id,name,created_at").order("created_at", { ascending: false });
  if (!a.error) return ok(res, a.data ?? []);

  const b = await sb.from("clients").select("id,name,created_at").order("created_at", { ascending: false });
  if (b.error) return fail(res, "WORKSPACES_FETCH_FAILED", 500, { details: { workspaces: a.error, clients: b.error } });

  return ok(res, b.data ?? []);
}
