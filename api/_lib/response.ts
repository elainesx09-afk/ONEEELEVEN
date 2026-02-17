// api/_lib/response.ts

function makeDebugId() {
  return `dbg_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function setCors(res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-api-token, workspace_id"
  );
}

export function ok(res: any, data: any, status = 200) {
  const debugId = makeDebugId();
  res.setHeader("X-Debug-Id", debugId);
  return res.status(status).json({ ok: true, data, debugId });
}

export function fail(res: any, error: string, status = 400, extra?: any) {
  const debugId = makeDebugId();
  res.setHeader("X-Debug-Id", debugId);

  // mantém compatibilidade com seu formato atual, mas evita espalhar keys arbitrárias
  const meta = extra ? extra : undefined;

  return res.status(status).json({
    ok: false,
    error,
    debugId,
    ...(meta ? { meta } : {}),
  });
}
