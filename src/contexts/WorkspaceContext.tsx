// api/workspaces.ts
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

  // MVP: token -> 1 workspace (o do header). Retorna exatamente esse workspace se existir.
  const wid = auth.workspace_id;

  const { data: ws, error } = await sb
    .from("workspaces")
    .select("*")
    .eq("id", wid)
    .maybeSingle();

  if (error) return fail(res, "WORKSPACE_FETCH_FAILED", 500, { details: error });
  if (!ws) {
    // Se não existir, ainda devolve um “workspace mínimo” pra UI não quebrar
    return ok(res, [{
      id: wid,
      name: "One Eleven",
      niche: "Workspace",
      timezone: "America/Sao_Paulo",
      status: "active",
      instances: 0,
      leads: 0,
      conversions: 0,
      lastActivity: "—",
      createdAt: new Date().toISOString(),
    }]);
  }

  return ok(res, [{
    id: String(ws.id),
    name: ws.name ?? "Workspace",
    niche: ws.niche ?? "Workspace",
    timezone: ws.timezone ?? "America/Sao_Paulo",
    status: ws.status ?? "active",
    instances: 0,
    leads: 0,
    conversions: 0,
    lastActivity: "—",
    createdAt: ws.created_at ?? new Date().toISOString(),
  }]);
}
