// api/version.ts
import { setCors, ok, fail } from "./_lib/response";

export default function handler(req: any, res: any) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return fail(res, "METHOD_NOT_ALLOWED", 405);

  return ok(res, {
    name: "one-eleven-api",
    now: new Date().toISOString(),
    sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    branch: process.env.VERCEL_GIT_COMMIT_REF || null,
    env: process.env.VERCEL_ENV || null,
  });
}
