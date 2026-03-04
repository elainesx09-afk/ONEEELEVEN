import { ok, fail } from "./_lib/response.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import crypto from "crypto";

export default async function handler(req, res) {

  if (req.method !== "POST")
    return fail(res,"METHOD_NOT_ALLOWED",405);

  const sb = await supabaseAdmin();

  const { company_name } = req.body || {};
  if (!company_name)
    return fail(res,"MISSING_COMPANY_NAME",400);

  const workspace_id = crypto.randomUUID();
  const api_token = "oneeleven_" + crypto.randomBytes(16).toString("hex");

  await sb.from("workspaces").insert({
    id: workspace_id,
    name: company_name,
    api_token
  });

  await sb.from("clients").insert({
    id: workspace_id,
    name: company_name,
    status: "active"
  });

  return ok(res,{
    workspace_id,
    api_token
  });
}
