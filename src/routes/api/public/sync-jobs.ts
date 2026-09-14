import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { jobMatchScore, recommendationReason, type CandidateProfile, type Job } from "@/lib/job-matching";

const MAX_SOURCES_PER_RUN = 6;

type Source = {
  id: string;
  name: string;
  short_name: string;
  scope: string;
  state: string | null;
  website_url: string;
};

type Notice = {
  title: string;
  url: string;
  lastDate: string | null;
};

const decodeHtml = (value: string) => value
  .replace(/<[^>]*>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&nbsp;/g, " ")
  .replace(/&#x2F;|&#47;/g, "/")
  .replace(/\s+/g, " ")
  .trim();

const relevantNotice = /(recruit|vacan|advertisement|notification|examination|exam|combined|assistant|officer|engineer|constable|lecturer|teacher|group|CEN|employment)/i;
const navigationText = /^(home|about|contact|login|tender|tenders|privacy|sitemap|menu|search|download|feedback|careers?)$/i;

function parseDate(value: string) {
  const match = value.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function extractNotices(html: string, source: Source): Notice[] {
  const notices: Notice[] = [];
  const anchorPattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = anchorPattern.exec(html)) !== null && notices.length < 40) {
    const title = decodeHtml(match[2]);
    if (title.length < 15 || title.length > 220 || navigationText.test(title) || !relevantNotice.test(title)) continue;
    let url: string;
    try {
      url = new URL(match[1], source.website_url).toString();
    } catch {
      continue;
    }
    if (!/^https?:\/\//i.test(url) || notices.some((notice) => notice.url === url)) continue;
    notices.push({ title, url, lastDate: parseDate(title) });
  }
  return notices;
}

const today = () => new Date().toISOString().slice(0, 10);

function addDays(date: string, days: number) {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/api/public/sync-jobs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = await authenticateCronRequest(request);
        if (authError) return authError;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("govt_jobs").update({ is_active: false }).lt("last_date", new Date().toISOString().slice(0, 10)).eq("is_active", true);
        const { data: sources, error: sourceError } = await supabaseAdmin
          .from("job_sources")
          .select("id, name, short_name, scope, state, website_url")
          .order("last_checked_at", { ascending: true, nullsFirst: true })
          .limit(MAX_SOURCES_PER_RUN);

        if (sourceError) {
          console.error("Unable to load job sources for sync", sourceError);
          return Response.json({ ok: false, error: "Unable to load job sources" }, { status: 500 });
        }

        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("alerts_enabled", true);
        const results: Array<{ source: string; status: "Completed" | "Failed"; jobsFound: number }> = [];
        for (const source of (sources ?? []) as Source[]) {
          const startedAt = new Date().toISOString();
          let status: "Completed" | "Failed" = "Failed";
          let message = "Source responded successfully";
          let jobsFound = 0;

          try {
            const response = await fetch(source.website_url, {
              method: "GET",
              headers: { "user-agent": "SarkariSetu source monitor/1.0" },
              signal: AbortSignal.timeout(8000),
            });
            if (!response.ok) throw new Error(`Source returned ${response.status}`);
            const notices = extractNotices(await response.text(), source);
            const noticeUrls = notices.map((notice) => notice.url);
            const { data: existingJobs } = noticeUrls.length > 0
              ? await supabaseAdmin.from("govt_jobs").select("source_url").in("source_url", noticeUrls)
              : { data: [] as Array<{ source_url: string }> };
            const existingUrls = new Set((existingJobs ?? []).map((job) => job.source_url));
            const newNotices = notices.filter((notice) => !existingUrls.has(notice.url));
            const postedDate = today();
            const jobsToInsert = newNotices.map((notice) => ({
              title: notice.title,
              organization: source.name,
              location: source.state ?? "Across India",
              state: source.state ?? "All India",
              level: source.scope,
              category: "Government recruitment",
              vacancies: 0,
              qualification: "See official notification",
              salary: "See official notification",
              posted_date: postedDate,
              last_date: notice.lastDate && notice.lastDate >= postedDate ? notice.lastDate : addDays(postedDate, 30),
              source_name: source.short_name,
              source_url: notice.url,
              apply_url: source.website_url,
              tags: [source.short_name, "Official notice"],
            }));
            if (jobsToInsert.length > 0) {
              const { data: insertedJobs, error: insertError } = await supabaseAdmin
                .from("govt_jobs")
                .insert(jobsToInsert)
                .select("*");
              if (insertError) throw insertError;
              jobsFound = insertedJobs?.length ?? 0;
              const alerts = (insertedJobs ?? []).flatMap((job) => (profiles ?? [])
                .filter((profile) => jobMatchScore(job as Job, profile as CandidateProfile) >= 30)
                .map((profile) => ({
                  user_id: profile.user_id,
                  job_id: job.id,
                  title: `New ${source.short_name} match`,
                  message: recommendationReason(job as Job, profile as CandidateProfile),
                })));
              if (alerts.length > 0) {
                const { error: alertError } = await supabaseAdmin
                  .from("notifications")
                  .upsert(alerts, { onConflict: "user_id,job_id", ignoreDuplicates: true });
                if (alertError) throw alertError;
              }
            }
            message = `Checked source and imported ${jobsFound} new notice${jobsFound === 1 ? "" : "s"}`;
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
            jobs_found: jobsFound,
            message,
            started_at: startedAt,
            completed_at: completedAt,
          });
          results.push({ source: source.name, status, jobsFound });
        }

        return Response.json({ ok: true, checked: results.length, results });
      },
    },
  },
});