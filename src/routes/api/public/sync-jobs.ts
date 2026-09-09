import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

const MAX_SOURCES_PER_RUN = 6;

export const Route = createFileRoute("/api/public/sync-jobs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = await authenticateCronRequest(request);
        if (authError) return authError;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: sources, error: sourceError } = await supabaseAdmin
          .from("job_sources")
          .select("id, name, website_url")
          .order("last_checked_at", { ascending: true, nullsFirst: true })
          .limit(MAX_SOURCES_PER_RUN);

        if (sourceError) {
          console.error("Unable to load job sources for sync", sourceError);
          return Response.json({ ok: false, error: "Unable to load job sources" }, { status: 500 });
        }

        const results: Array<{ source: string; status: "Completed" | "Failed" }> = [];
        for (const source of sources ?? []) {
          const startedAt = new Date().toISOString();
          let status: "Completed" | "Failed" = "Failed";
          let message = "Source responded successfully";

          try {
            const response = await fetch(source.website_url, {
              method: "GET",
              headers: { "user-agent": "SarkariSetu source monitor/1.0" },
              signal: AbortSignal.timeout(8000),
            });
            if (!response.ok) throw new Error(`Source returned ${response.status}`);
            status = "Completed";
          } catch (error) {
            message = error instanceof Error ? error.message : "Source check failed";
          }

          const completedAt = new Date().toISOString();
          await supabaseAdmin.from("job_sources").update({
            last_checked_at: completedAt,
            status: status === "Completed" ? "Watching" : "Paused",
          }).eq("id", source.id);
          await supabaseAdmin.from("job_sync_runs").insert({
            source_id: source.id,
            status,
            jobs_found: 0,
            message,
            started_at: startedAt,
            completed_at: completedAt,
          });
          results.push({ source: source.name, status });
        }

        return Response.json({ ok: true, checked: results.length, results });
      },
    },
  },
});