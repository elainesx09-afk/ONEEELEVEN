export function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-api-token, workspace_id, x-inbound-secret"
  );
}

export function ok(res, data, status = 200) {
  return res.status(status).json({ ok: true, data });
}

export function fail(res, error, status = 400, extra) {
  const debugId = `dbg_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  return res.status(status).json({
    ok: false,
    error,
    debugId,
    ...(extra || {}),
  });
}
