import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";

async function getBody(req) {
  if (req.body) return req.body;
  return new Promise((resolve) => {
    let data = "";
    req.on("data", chunk => data += chunk);
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return ok(res, { route: "/api/inbound", version: "2.1.0" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id;

  if (!sb) return fail(res, "SUPABASE_NOT_AVAILABLE", 500);

  try {
    const body = await getBody(req);
    const lead_phone = body.lead_phone || body.phone;
    const message = body.message;
    const instance =
      body.instance_name ||
      body.instance ||
      body.session ||
      body.sender ||
      "default";

    if (!lead_phone) return fail(res, "MISSING_LEAD_PHONE", 400);
    if (!message) return fail(res, "MISSING_MESSAGE", 400);

    // INSTANCE
    await sb.from("instances").upsert({
      client_id,
      instance_name: instance,
      status: "connected",
      updated_at: new Date().toISOString()
    }, { onConflict: "client_id,instance_name" });

    // FIND LEAD
    let { data: lead } = await sb
      .from("leads")
      .select("*")
      .eq("client_id", client_id)
      .eq("phone", lead_phone)
      .maybeSingle();

    if (!lead) {
      const { data: newLead } = await sb
        .from("leads")
        .insert({
          client_id,
          phone: lead_phone,
          name: "Novo Lead",
          stage: "NOVO",
          created_at: new Date().toISOString()
        })
        .select("*")
        .maybeSingle();
      lead = newLead;
    }

    // MEMORY AUTO CREATE
    const { data: existingMemory } = await sb
      .from("lead_memory")
      .select("id")
      .eq("lead_id", lead.id)
      .maybeSingle();

    if (!existingMemory) {
      await sb.from("lead_memory").insert({
        client_id,
        lead_id: lead.id,
        cognitive_state: {
          awareness_level: "unknown",
          buying_temperature: "cold",
          resistance_level: 0,
          trust_level: 0
        },
        scores: {
          lead_score: 0,
          churn_risk: 0,
          engagement_score: 0
        },
        strategy_history: [],
        created_at: new Date().toISOString()
      });
    }

    // SAVE MESSAGE
    await sb.from("messages").insert({
      client_id,
      lead_id: lead.id,
      direction: "inbound",
      content: message,
      instance,
      created_at: new Date().toISOString()
    });

    // UPDATE LAST MESSAGE
    await sb.from("leads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", lead.id);

    // =============================
    // DETECTOR DE INTENÇÃO
    // =============================
    const text = message.toLowerCase();
    let newStage = lead.stage || "novo";

    if (text.includes("agendar") || text.includes("horario") || text.includes("marcar")) {
      newStage = "agendado";
    } else if (text.includes("preço") || text.includes("valor") || text.includes("quanto custa")) {
      newStage = "atendimento";
    } else if (text.includes("quero") || text.includes("interesse")) {
      newStage = "qualificado";
    } else if (text.includes("não quero") || text.includes("deixa")) {
      newStage = "perdido";
    }

    // atualiza lead
    await sb
      .from("leads")
      .update({
        stage: newStage,
        last_message: message,
        last_interaction_at: new Date().toISOString()
      })
      .eq("id", lead.id);

    return ok(res, { success: true });

  } catch (err) {
    console.error("INBOUND ERROR:", err);
    return fail(res, "INTERNAL_ERROR", 500);
  }
}
