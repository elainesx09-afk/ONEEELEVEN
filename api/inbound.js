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

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return ok(res, {
      route: "/api/inbound",
      version: "2.0.1"
    });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id;

  if (!sb) {
    return fail(res, "SUPABASE_NOT_AVAILABLE", 500);
  }

  try {
    const body = await getBody(req);

    const lead_phone = body.lead_phone || body.phone;
    const message = body.message;
    const instance = body.instance_name || body.instance || null;

    if (!lead_phone) {
      return fail(res, "MISSING_LEAD_PHONE", 400);
    }

    if (!message) {
      return fail(res, "MISSING_MESSAGE", 400);
    }

    // =============================
    // FIND OR CREATE LEAD
    // =============================
    let { data: lead } = await sb
      .from("leads")
      .select("*")
      .eq("client_id", client_id)
      .eq("phone", lead_phone)
      .maybeSingle();

    if (!lead) {
      const { data: newLead, error } = await sb
        .from("leads")
        .insert({
          client_id,
          phone: lead_phone,
          name: "Novo Lead",
          status: "Novo",
          created_at: new Date().toISOString()
        })
        .select("*")
        .maybeSingle();

      if (error) throw error;
      lead = newLead;
    }

    // =============================
    // SAVE MESSAGE
    // =============================
    await sb.from("messages").insert({
      client_id,
      lead_id: lead.id,
      direction: "inbound",
      content: message,
      instance,
      created_at: new Date().toISOString()
    });

    return ok(res, { success: true });

  } catch (err) {
    console.error("INBOUND ERROR:", err);
    return fail(res, "INTERNAL_ERROR", 500);
  }
}
