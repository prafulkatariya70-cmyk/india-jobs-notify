import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, ExternalLink, GraduationCap, Landmark, MapPin, Save, UsersRound } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createApplication, fetchJob, type GovJob } from "@/lib/gov-api";

type Job = GovJob;

export const Route = createFileRoute("/jobs/$id")({
  loader: async ({ params }) => {
    try {
      return { job: await fetchJob(params.id) };
    } catch {
      return { job: null };
    }
  },
  head: () => ({
    meta: [
      { title: "Government job details — Rozgaar" },
      { name: "description", content: "Review eligibility, vacancies, salary, deadline and official application details for this government job." },
      { property: "og:title", content: "Government job details — Rozgaar" },
      { property: "og:description", content: "Review verified government job details and continue to the official application portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JobDetailsPage,
});

function JobDetailsPage() {
  const { job } = Route.useLoaderData();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);

  if (!job) {
    return <main className="flex min-h-screen items-center justify-center px-5"><div className="text-center"><h1 className="font-display text-3xl font-bold">This opening is no longer active</h1><p className="mt-3 text-muted-foreground">Browse the latest open opportunities to find another match.</p><Button className="mt-6" asChild><Link to="/">Browse jobs</Link></Button></div></main>;
  }

  const saveJob = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) { await navigate({ to: "/auth" }); return; }
    try {
      await createApplication({ job_id: job.id, status: "Saved" });
      setSaved(true);
    } catch {
      // Keep the action retryable if the API is temporarily unavailable.
    }
  };

  return <main className="min-h-screen bg-background text-foreground">
    <nav className="border-b border-border bg-background"><div className="mx-auto flex h-[72px] max-w-[1040px] items-center justify-between px-5 lg:px-8"><Link to="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Landmark className="h-5 w-5" /></span><span className="font-display text-[21px] font-bold">Rozgaar</span></Link><Button variant="ghost" size="sm" asChild><Link to="/"><ArrowLeft className="h-4 w-4" /> Back to jobs</Link></Button></div></nav>
    <div className="mx-auto max-w-[1040px] px-5 py-12 lg:px-8 lg:py-16">
      <div className="flex flex-wrap items-center gap-2"><Badge>{/kpsc|karnataka/i.test(job.source_name ?? "") ? "State" : "Central"}</Badge><Badge variant="secondary">{job.source_name ?? "Official source"} verified</Badge></div>
      <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-tight tracking-[-0.04em] sm:text-5xl">{job.title}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{job.organization_name}</p>
      <div className="mt-8 grid gap-3 border-y border-border py-5 sm:grid-cols-4"><Detail icon={<MapPin />} label="Location" value={job.eligibility?.eligible_states || "All India"} /><Detail icon={<GraduationCap />} label="Qualification" value={job.eligibility?.qualification_text || job.eligibility?.degree || job.eligibility?.education_level || "See official notification"} /><Detail icon={<UsersRound />} label="Vacancies" value="See notification" /><Detail icon={<CalendarDays />} label="Last date" value={job.application_end ? new Date(`${job.application_end}T12:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Not specified"} /></div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_300px]">
        <article><p className="text-sm font-semibold text-primary">JOB OVERVIEW</p><h2 className="mt-2 font-display text-2xl font-bold">What you should know</h2><dl className="mt-6 grid gap-5 sm:grid-cols-2"><Info label="Department" value={job.organization_name} /><Info label="Category" value={job.opportunity_type.replaceAll("_", " ")} /><Info label="Pay scale" value="See official notification" /><Info label="Posted on" value={new Date(job.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} /></dl><div className="mt-10"><h2 className="font-display text-2xl font-bold">Eligibility</h2><p className="mt-3 leading-7 text-muted-foreground">{job.eligibility?.qualification_text || job.eligibility?.degree || job.eligibility?.education_level || "Review the official notification"} for age limits, reservation rules, examination stages and document requirements before applying.</p></div><div className="mt-10"><h2 className="font-display text-2xl font-bold">Keywords</h2><div className="mt-4 flex flex-wrap gap-2">{[job.opportunity_type, job.eligibility?.branch, job.eligibility?.eligible_categories].filter(Boolean).map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div></div></article>
        <aside className="h-fit border border-border bg-card p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Official application</p><p className="mt-3 text-sm leading-6 text-muted-foreground">Use the recruiting body’s portal for the final notification and application.</p><Button className="mt-6 w-full" asChild><a href={job.official_url} target="_blank" rel="noreferrer">Apply officially <ExternalLink className="h-4 w-4" /></a></Button><Button className="mt-3 w-full" variant={saved ? "secondary" : "outline"} onClick={saveJob} disabled={saved}><Save className="h-4 w-4" /> {saved ? "Saved to tracker" : "Save for later"}</Button><a className="mt-4 block text-center text-sm font-semibold text-primary hover:underline" href={job.official_url} target="_blank" rel="noreferrer">Visit {job.source_name ?? "official source"}</a></aside>
      </div>
    </div>
  </main>;
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="min-w-0"><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>{label}</div><p className="mt-1 font-medium">{value}</p></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="border-l-2 border-primary/20 pl-4"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>; }