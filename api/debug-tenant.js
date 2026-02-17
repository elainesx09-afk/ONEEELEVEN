// api/debug-tenant.ts
export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-api-token, workspace_id"
  );

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET")
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  const token = req.headers["x-api-token"] || null;
  const workspace = req.headers["workspace_id"] || null;

  return res.status(200).json({
    ok: true,
    received: {
      token_present: !!token,
      token_prefix: token ? String(token).slice(0, 12) : null,
      workspace_present: !!workspace,
      workspace_id: workspace,
    },
    envs_present: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      VERCEL_ENV: process.env.VERCEL_ENV || null,
    },
  });
}
