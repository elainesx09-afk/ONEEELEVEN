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

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const sb = await supabaseAdmin();
  const client_id = auth.workspace_id;

  try {

    const body = await getBody(req);

    const phone = body.phone;
    const reply = body.reply;
    const stage = body.stage;

    if (!phone) {
      return fail(res, "MISSING_PHONE", 400);
    }

    if (!reply) {
      return fail(res, "MISSING_REPLY", 400);
    }

    const { data: lead } = await sb
      .from("leads")
      .select("*")
      .eq("client_id", client_id)
      .eq("phone", phone)
      .maybeSingle();

    if (!lead) {
      return fail(res, "LEAD_NOT_FOUND", 404);
    }

    await sb.from("messages").insert({
      client_id,
      lead_id: lead.id,
      direction: "outbound",
      content: reply,
      created_at: new Date().toISOString()
    });

    if (stage) {
      await sb
        .from("leads")
        .update({ stage })
        .eq("id", lead.id);
    }

    return ok(res, {
      success: true
    });

  } catch (err) {

    console.error(err);

    return fail(res, "INTERNAL_ERROR", 500);
  }
}
