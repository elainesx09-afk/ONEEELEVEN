import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS básico (não quebra chamadas do browser)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-token, workspace_id");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  // Metadados simples pra debug
  const now = new Date().toISOString();
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || null;
  const branch = process.env.VERCEL_GIT_COMMIT_REF || null;
  const env = process.env.VERCEL_ENV || null;

  return res.status(200).json({
    ok: true,
    name: "one-eleven-api",
    route: "/api/version",
    now,
    sha,
    branch,
    env,
  });
}
