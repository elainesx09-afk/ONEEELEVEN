import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, setCors } from './_lib/cors.js';
import { getTenant } from './_lib/tenantGuard.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';

const LEADS_TABLE = process.env.LEADS_TABLE || 'leads';
const MSG_TABLE = process.env.MESSAGES_TABLE || 'messages';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  setCors(res);

  try {
    const { workspaceId } = getTenant(req);
    const supabase = getSupabaseAdmin();

    const { data: leads, error: leadsErr } = await supabase
      .from(LEADS_TABLE)
      .select('id, stage')
      .eq('workspace_id', workspaceId);

    if (leadsErr) throw leadsErr;

    const stageCounts: Record<string, number> = {};
    for (const l of leads || []) {
      const st = (l as any).stage || 'sem_stage';
      stageCounts[st] = (stageCounts[st] || 0) + 1;
    }

    const { count: messagesCount, error: msgErr } = await supabase
      .from(MSG_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    if (msgErr) throw msgErr;

    return res.status(200).json({
      ok: true,
      totals: {
        leads: (leads || []).length,
        messages: messagesCount || 0,
      },
      stageCounts,
    });
  } catch (e: any) {
    const status = e?.statusCode || 500;
    return res.status(status).json({ ok: false, error: e?.message || 'Server error' });
  }
}
