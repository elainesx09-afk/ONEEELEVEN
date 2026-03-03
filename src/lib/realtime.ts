import { supabase } from "./supabase";

export function realtimeLeads(workspaceId: string, callback: () => void) {
  return supabase
    .channel("leads-live")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "leads",
        filter: `client_id=eq.${workspaceId}`,
      },
      () => callback()
    )
    .subscribe();
}
