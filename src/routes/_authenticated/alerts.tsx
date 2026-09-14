import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bell, Check, ExternalLink, Landmark, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Notification = Tables<"notifications">;
type Job = Tables<"govt_jobs">;
type AlertItem = Notification & { job: Job | undefined };

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "Job alerts — SarkariSetu" },
      { name: "description", content: "Review new government job openings matched to your candidate details." },
      { property: "og:title", content: "Job alerts — SarkariSetu" },
      { property: "og:description", content: "Review new government job openings matched to your candidate details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAlerts = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      await navigate({ to: "/auth" });
      return;
    }
    const [{ data: alerts }, { data: jobs }] = await Promise.all([
      supabase.from("notifications").select("*").eq("user_id", userData.user.id).order("created_at", { ascending: false }),
      supabase.from("govt_jobs").select("*").eq("is_active", true),
    ]);
    const jobMap = new Map((jobs ?? []).map((job) => [job.id, job]));
    setItems((alerts ?? []).map((alert) => ({ ...alert, job: jobMap.get(alert.job_id) })));
    setLoading(false);
  };

  useEffect(() => { void loadAlerts(); }, []);

  const markRead = async (item: AlertItem) => {
    if (item.is_read) return;
    setBusyId(item.id);
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", item.id);
    if (!error) setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_read: true } : entry));
    setBusyId(null);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background">
        <div className="mx-auto flex h-[72px] max-w-[1040px] items-center justify-between px-5 lg:px-8">
          <Link to="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Landmark className="h-5 w-5" /></span><span className="font-display text-[21px] font-bold">SarkariSetu</span></Link>
          <div className="flex items-center gap-2"><Button variant="ghost" size="sm" asChild><Link to="/"><ArrowLeft className="h-4 w-4" /> Browse jobs</Link></Button><Button variant="outline" size="sm" asChild><Link to="/profile">Alert settings</Link></Button></div>
        </div>
      </nav>
      <div className="mx-auto max-w-[1040px] px-5 py-12 lg:px-8 lg:py-16">
        <div className="border-b border-border pb-8"><div className="flex items-center gap-3 text-primary"><Bell className="h-5 w-5" /><p className="text-sm font-semibold">PERSONALIZED ALERTS</p></div><h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em]">New matches for you.</h1><p className="mt-3 max-w-2xl text-muted-foreground">When a new notice matches your saved qualifications and preferences, it appears here.</p></div>
        {loading ? <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your alerts</div> : items.length === 0 ? <div className="border border-dashed border-border py-20 text-center"><Bell className="mx-auto h-9 w-9 text-muted-foreground" /><h2 className="mt-4 font-display text-2xl font-bold">No alerts yet.</h2><p className="mt-2 text-sm text-muted-foreground">Keep your candidate details updated and we’ll show new matching notices here.</p><Button className="mt-6" asChild><Link to="/profile">Review my details</Link></Button></div> : <div className="mt-8 grid gap-3">{items.map((item) => <AlertCard key={item.id} item={item} busy={busyId === item.id} onRead={markRead} />)}</div>}
      </div>
    </main>
  );
}

function AlertCard({ item, busy, onRead }: { item: AlertItem; busy: boolean; onRead: (item: AlertItem) => void }) {
  const job = item.job;
  return <article className={`border p-5 sm:p-6 ${item.is_read ? "border-border bg-card" : "border-primary/35 bg-primary/[0.035]"}`}><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge>{job?.source_name ?? "Government job"}</Badge>{!item.is_read && <Badge variant="secondary">New</Badge>}</div><h2 className="mt-3 font-display text-xl font-bold">{job ? <Link to="/jobs/$id" params={{ id: job.id }} className="hover:text-primary">{job.title}</Link> : item.title}</h2><p className="mt-2 text-sm text-muted-foreground">{item.message}</p>{job && <p className="mt-3 text-xs text-muted-foreground">{job.organization} · Deadline {new Date(`${job.last_date}T12:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>}</div><div className="flex shrink-0 items-center gap-2"><Button variant="ghost" size="icon" onClick={() => onRead(item)} disabled={busy || item.is_read} aria-label={item.is_read ? "Alert already read" : "Mark alert as read"}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</Button>{job && <Button variant="outline" size="icon" asChild><a href={job.apply_url} target="_blank" rel="noreferrer" aria-label="Open official application"><ExternalLink className="h-4 w-4" /></a></Button>}</div></div></article>;
}