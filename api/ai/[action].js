import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCors, ok, fail } from "../_lib/response.js";
import { requireAuth } from "../_lib/auth.js";
import { supabaseAdmin } from "../_lib/supabaseAdmin.js";

// ─── helpers ────────────────────────────────────────────────────────────────

async function getBody(req: VercelRequest) {
  if (req.body) return req.body;
  return new Promise<Record<string, any>>((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); }
      catch { resolve({}); }
    });
  });
}

// ─── /api/ai/brain ───────────────────────────────────────────────────────────

async function handleBrain(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return ok(res, { engine: "core_ai" });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();

  try {
    const { lead_id, message } = req.body;
    const text = (message as string).toLowerCase();

    let stage = "novo";
    if (text.includes("preço") || text.includes("valor"))      stage = "em_atendimento";
    if (text.includes("agendar") || text.includes("horario"))  stage = "qualificado";
    if (text.includes("confirmar"))                            stage = "agendado";
    if (text.includes("problema") || text.includes("cancelar")) stage = "pos_venda";

    await sb.from("leads").update({ stage }).eq("id", lead_id);

    await fetch(process.env.N8N_WEBHOOK as string, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id, stage, message }),
    });

    return ok(res, { stage });
  } catch (e) {
    console.error(e);
    return fail(res, "AI_ENGINE_ERROR");
  }
}

// ─── /api/ai/priority ────────────────────────────────────────────────────────

async function handlePriority(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  try {
    const {
      lead_id,
      last_message_from,
      messages_count,
      stage,
      last_interaction_minutes,
    } = req.body;

    let priority = 50;
    let chance = 30;

    if (last_message_from === "lead")  { priority += 20; chance += 15; }
    if (messages_count > 5)            { priority += 10; chance += 10; }
    if (stage === "negociacao")        { priority += 15; chance += 25; }
    if (stage === "qualificado")       { chance += 15; }
    if (last_interaction_minutes > 120)  { priority -= 10; }
    if (last_interaction_minutes > 1440) { chance -= 15; }

    priority = Math.max(1, Math.min(priority, 100));
    chance   = Math.max(1, Math.min(chance,   100));

    const sb = await supabaseAdmin();
    await sb
      .from("leads")
      .update({ priority_score: priority, chance_de_venda: chance })
      .eq("id", lead_id);

    return res.json({ ok: true, priority, chance_de_venda: chance });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// ─── /api/ai/response ────────────────────────────────────────────────────────

async function handleResponse(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id;

  try {
    const body = await getBody(req);
    const { phone, reply, stage } = body;

    if (!phone) return fail(res, "MISSING_PHONE", 400);
    if (!reply) return fail(res, "MISSING_REPLY", 400);

    const { data: lead } = await sb
      .from("leads")
      .select("*")
      .eq("client_id", client_id)
      .eq("phone", phone)
      .maybeSingle();

    if (!lead) return fail(res, "LEAD_NOT_FOUND", 404);

    await sb.from("messages").insert({
      client_id,
      lead_id: lead.id,
      direction: "outbound",
      content: reply,
      created_at: new Date().toISOString(),
    });

    if (stage) {
      await sb.from("leads").update({ stage }).eq("id", lead.id);
    }

    return ok(res, { success: true });
  } catch (err) {
    console.error(err);
    return fail(res, "INTERNAL_ERROR", 500);
  }
}

// ─── router principal ────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === "OPTIONS") return res.status(204).end();

  const action = req.query.action as string;

  switch (action) {
    case "brain":    return handleBrain(req, res);
    case "priority": return handlePriority(req, res);
    case "response": return handleResponse(req, res);
    default:
      return res.status(404).json({ ok: false, error: "AI_ACTION_NOT_FOUND" });
  }
}
