import { setCors, ok, fail } from "./_lib/response.js";
import { requireAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const route = req.query?.route;

  if (!route) {
    return fail(res, "MISSING_ROUTE", 400);
  }

  const sb = await supabaseAdmin();
  if (!sb) return fail(res, "SUPABASE_NOT_AVAILABLE", 500);

  try {

    // =========================
    // 🔓 INBOUND PUBLIC (SEM AUTH)
    // =========================
    if (route === "inbound" && req.method === "POST") {
      const body = req.body || {};

      const phone = body.phone;
      const message = body.message;
      const client_id = body.client_id; // IMPORTANTE
      const instance = body.instance || "demo";

      if (!phone || !message || !client_id) {
        return fail(res, "INVALID_PAYLOAD", 400);
      }

      // 1️⃣ Busca ou cria lead
      let { data: lead } = await sb
        .from("leads")
        .select("*")
        .eq("client_id", client_id)
        .eq("phone", phone)
        .maybeSingle();

      if (!lead) {
        const { data: newLead, error } = await sb
          .from("leads")
          .insert({
            client_id,
            phone,
            name: "Novo Lead",
            status: "Novo",
            created_at: new Date().toISOString()
          })
          .select("*")
          .maybeSingle();

        if (error) return fail(res, "LEAD_CREATE_FAILED", 500);

        lead = newLead;
      }

      // 2️⃣ Salva mensagem
      const { error: msgError } = await sb
        .from("messages")
        .insert({
          client_id,
          lead_id: lead.id,
          direction: "inbound",
          content: message,
          instance,
          created_at: new Date().toISOString()
        });

      if (msgError) return fail(res, "MESSAGE_SAVE_FAILED", 500);

      return ok(res, { success: true });
    }

    // =========================
    // 🔒 ROTAS COM AUTH
    // =========================
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const client_id = auth.workspace_id;

    if (route === "clients" && req.method === "GET") {
      const { data, error } = await sb
        .from("clients")
        .select("*")
        .eq("id", client_id)
        .maybeSingle();

      if (error) return fail(res, "CLIENT_FETCH_FAILED", 500);

      return ok(res, data ? [data] : []);
    }

    if (route === "instances" && req.method === "GET") {
      const { data, error } = await sb
        .from("instances")
        .select("*")
        .eq("client_id", client_id)
        .order("created_at", { ascending: false });

      if (error) return fail(res, "INSTANCES_FETCH_FAILED", 500);

      return ok(res, data || []);
    }

    if (route === "instances" && req.method === "POST") {
      const body = req.body || {};
      const instance_name = body.instance_name;

      if (!instance_name) return fail(res, "MISSING_INSTANCE_NAME", 400);

      const { data, error } = await sb
        .from("instances")
        .insert({
          client_id,
          instance_name,
          status: "disconnected",
          created_at: new Date().toISOString(),
        })
        .select("*")
        .maybeSingle();

      if (error) return fail(res, "INSTANCE_CREATE_FAILED", 500);

      return ok(res, data, 201);
    }

    if (route === "leads" && req.method === "GET") {
      const { data, error } = await sb
        .from("leads")
        .select("*")
        .eq("client_id", client_id)
        .order("created_at", { ascending: false });

      if (error) return fail(res, "LEADS_FETCH_FAILED", 500);

      return ok(res, data || []);
    }

    return fail(res, "ROUTE_NOT_FOUND", 404);

  } catch (err) {
    console.error("API ERROR:", err);
    return fail(res, "INTERNAL_ERROR", 500);
  }
}
