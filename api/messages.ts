import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, setCors } from './_lib/cors.js';
import { getTenant } from './_lib/tenantGuard.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';

const TABLE = process.env.MESSAGES_TABLE || 'messages';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  setCors(res);

  try {
    const { workspaceId } = getTenant(req);
    const supabase = getSupabaseAdmin();

    if (req.method === 'GET') {
      const leadId = (req.query.lead_id || req.query.leadId) as string | undefined;
      if (!leadId) return res.status(400).json({ ok: false, error: 'lead_id is required' });

      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return res.status(200).json({ ok: true, messages: data || [] });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const leadId = body?.lead_id || body?.leadId;
      const text = body?.text || body?.content;
      const direction = body?.direction || 'out';

      if (!leadId || !text) {
        return res.status(400).json({ ok: false, error: 'lead_id and text are required' });
      }

      const insertRow: any = {
        workspace_id: workspaceId,
        lead_id: leadId,
        direction,
        text,
      };

      const { data, error } = await supabase
        .from(TABLE)
        .insert(insertRow)
        .select('*')
        .single();

      if (error) throw error;
      return res.status(200).json({ ok: true, message: data });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (e: any) {
    const status = e?.statusCode || 500;
    return res.status(status).json({ ok: false, error: e?.message || 'Server error' });
  }
}
