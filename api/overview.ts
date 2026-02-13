// api/overview.ts
import { setCors, ok, fail } from "./_lib/response";
import { requireAuth } from "./_lib/auth";
import { supabaseAdmin } from "./_lib/supabaseAdmin";

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id;

  const { data, error } = await sb
    .from("leads")
    .select("status")
    .eq("client_id", client_id);

  if (error) return fail(res, "OVERVIEW_FETCH_FAILED", 500, { details: error });

  const statuses = (data ?? []).map((x: any) => String(x.status || "Novo"));
  const count = (s: string) => statuses.filter(v => v === s).length;

  return ok(res, {
    total_leads: statuses.length,
    new_leads: count("Novo"),
    qualified: count("Qualificado"),
    scheduled: count("Agendado"),
    closed: count("Fechado"),
    lost: count("Perdido"),
  });
}
