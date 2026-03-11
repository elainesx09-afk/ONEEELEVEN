import { ok, fail, setCors } from "./_lib/response.js";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import crypto from "crypto";

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return fail(res, "METHOD_NOT_ALLOWED", 405);
  }

  try {
    const sb = await supabaseAdmin();

    const { 
      company_name, 
      contact_name, 
      email, 
      phone 
    } = req.body || {};

    // Validação
    if (!company_name) {
      return fail(res, "MISSING_COMPANY_NAME", 400);
    }

    // ========================================================================
    // 1. PEGAR AGENCY_ID (sua agência)
    // ========================================================================
    const { data: agency, error: agencyError } = await sb
      .from("agency")
      .select("id")
      .limit(1)
      .single();

    if (agencyError || !agency) {
      // Se não existir agency, criar uma
      const { data: newAgency } = await sb
        .from("agency")
        .insert({
          name: "ONE ELEVEN Agency",
        })
        .select()
        .single();

      if (!newAgency) {
        return fail(res, "AGENCY_CREATION_FAILED", 500);
      }

      agency.id = newAgency.id;
    }

    // ========================================================================
    // 2. CRIAR WORKSPACE
    // ========================================================================
    const workspace_id = crypto.randomUUID();
    const api_token = "oneeleven_" + crypto.randomBytes(16).toString("hex");

    const { error: workspaceError } = await sb
      .from("workspaces")
      .insert({
        id: workspace_id,
        name: company_name,
      });

    if (workspaceError) {
      console.error("Workspace error:", workspaceError);
      return fail(res, "WORKSPACE_CREATION_FAILED", 500);
    }

    // ========================================================================
    // 3. CRIAR CLIENT
    // ========================================================================
    const { data: client, error: clientError } = await sb
      .from("clients")
      .insert({
        id: workspace_id, // Usando mesmo ID para simplificar
        agency_id: agency.id,
        name: company_name,
        email: email || null,
        phone: phone || null,
        status: "active",
      })
      .select()
      .single();

    if (clientError) {
      console.error("Client error:", clientError);
      return fail(res, "CLIENT_CREATION_FAILED", 500);
    }

    // ========================================================================
    // 4. CRIAR API TOKEN (se tabela existir)
    // ========================================================================
    try {
      await sb.from("api_tokens").insert({
        id: crypto.randomUUID(),
        workspace_id: workspace_id,
        token: api_token,
        name: "Token Principal",
      });
    } catch (tokenError) {
      console.warn("API token creation skipped (table may not exist)");
    }

    // ========================================================================
    // 5. CRIAR URL DE ACESSO
    // ========================================================================
    const base_url = process.env.VITE_API_BASE_URL || "https://oneeeleven111.vercel.app";
    const access_url = `${base_url}?workspace_id=${workspace_id}&token=${api_token}`;

    // ========================================================================
    // 6. RETORNAR CREDENCIAIS
    // ========================================================================
    return ok(res, {
      success: true,
      client_id: client.id,
      workspace_id: workspace_id,
      api_token: api_token,
      access_url: access_url,
      credentials: {
        workspace_id,
        token: api_token,
      },
      message: `Cliente ${company_name} criado com sucesso!`,
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return fail(res, "ONBOARDING_FAILED: " + error.message, 500);
  }
}
