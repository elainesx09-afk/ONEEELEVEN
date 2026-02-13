import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, setCors } from './_lib/cors.js';
import { getTenant } from './_lib/tenantGuard.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';

const TABLE = process.env.LEADS_TABLE || 'leads';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  setCors(res);

  try {
    const { workspaceId } = getTenant(req);
    const supabase = getSupabaseAdmin();

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ ok: true, leads: data || [] });
    }

    if (req.method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const leadId = body?.lead_id || body?.id;
      const stage = body?.stage;

      if (!leadId || !stage) {
        return res.status(400).json({ ok: false, error: 'lead_id and stage are required' });
      }

      const { data, error } = await supabase
        .from(TABLE)
        .update({ stage })
        .eq('workspace_id', workspaceId)
        .eq('id', leadId)
        .select('*')
        .single();

      if (error) throw error;
      return res.status(200).json({ ok: true, lead: data });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (e: any) {
    const status = e?.statusCode || 500;
    return res.status(status).json({ ok: false, error: e?.message || 'Server error' });
  }
}
