export function setCors(res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-token, workspace_id");
}

export function ok(res: any, data: any, status = 200) {
  return res.status(status).json({ ok: true, data });
}

export function fail(res: any, error: string, status = 400, extra?: any) {
  const debugId = `dbg_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  return res.status(status).json({ ok: false, error, debugId, ...(extra || {}) });
}
