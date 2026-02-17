import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, setCors } from './_lib/cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  setCors(res);
  res.status(200).json({ ok: true, ts: new Date().toISOString() });
}
