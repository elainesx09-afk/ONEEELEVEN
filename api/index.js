const { setCors, ok, fail } = require("./_lib/response.js");
const { requireAuth } = require("./_lib/auth.js");
const { supabaseAdmin } = require("./_lib/supabaseAdmin.js");

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const route = req.query?.route;
  if (!route) return fail(res, "MISSING_ROUTE", 400);

  const sb = await supabaseAdmin();
  if (!sb) return fail(res, "SUPABASE_NOT_AVAILABLE", 500);

  try {

    if (route === "test") {
      return ok(res, { status: "API_WORKING" });
    }

    return fail(res, "ROUTE_NOT_FOUND", 404);

  } catch (err) {
    console.error("API ERROR:", err);
    return fail(res, "INTERNAL_ERROR", 500);
  }
};
