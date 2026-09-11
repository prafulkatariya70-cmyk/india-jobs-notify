import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Landmark, Loader2, LogOut, NotebookPen, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Application = Tables<"job_applications">;
type Job = Tables<"govt_jobs">;
type TrackerItem = Application & { job: Job | undefined };
const statuses = ["Saved", "Applied", "Shortlisted", "Rejected", "Selected"] as const;

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({
    meta: [
      { title: "My applications — SarkariSetu" },
      { name: "description", content: "Track saved government jobs and application progress on SarkariSetu." },
      { property: "og:title", content: "My applications — SarkariSetu" },
      { property: "og:description", content: "Keep your saved government jobs and application progress organized." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<TrackerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("there");

  const loadApplications = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) { await navigate({ to: "/auth" }); return; }
    const [{ data: applications }, { data: jobs }, { data: profile }] = await Promise.all([
      supabase.from("job_applications").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
      supabase.from("govt_jobs").select("*").eq("is_active", true),
      supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
    ]);
    const jobMap = new Map((jobs ?? []).map((job) => [job.id, job]));
    setItems((applications ?? []).map((application) => ({ ...application, job: jobMap.get(application.job_id) })));
    setProfileName(profile?.display_name || user.email?.split("@")[0] || "there");
    setLoading(false);
  };

  useEffect(() => { void loadApplications(); }, []);

  const counts = useMemo(() => statuses.reduce<Record<string, number>>((result, status) => {
    result[status] = items.filter((item) => item.status === status).length;
    return result;
  }, {}), [items]);

  const updateItem = async (item: TrackerItem, changes: Partial<Application>) => {
    setSavingId(item.id);
    const { data, error } = await supabase.from("job_applications").update(changes).eq("id", item.id).select().single();
    if (!error && data) setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, ...data } : entry));
    setSavingId(null);
  };

  const removeItem = async (item: TrackerItem) => {
    setSavingId(item.id);
    const { error } = await supabase.from("job_applications").delete().eq("id", item.id);
    if (!error) setItems((current) => current.filter((entry) => entry.id !== item.id));
    setSavingId(null);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background"><div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 lg:px-8"><Link to="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Landmark className="h-5 w-5" /></span><span className="font-display text-[21px] font-bold">SarkariSetu</span></Link><div className="flex items-center gap-2"><Button variant="ghost" size="sm" asChild><Link to="/"><ArrowLeft className="h-4 w-4" /> Browse jobs</Link></Button><Button variant="outline" size="sm" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button></div></div></nav>
      <div className="mx-auto max-w-[1240px] px-5 py-12 lg:px-8 lg:py-16"><div className="flex flex-col justify-between gap-6 border-b border-border pb-8 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-primary">YOUR APPLICATION DESK</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-0.04em]">Hi, {profileName}.</h1><p className="mt-3 text-muted-foreground">Keep your saved opportunities and progress in one place.</p></div><div className="flex gap-2"><Stat label="Saved" value={counts.Saved ?? 0} /><Stat label="Applied" value={counts.Applied ?? 0} /><Stat label="Selected" value={counts.Selected ?? 0} /></div></div>
        {loading ? <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your applications</div> : items.length === 0 ? <div className="border border-dashed border-border py-20 text-center"><NotebookPen className="mx-auto h-9 w-9 text-muted-foreground" /><h2 className="mt-4 font-display text-2xl font-bold">Your tracker is ready.</h2><p className="mt-2 text-sm text-muted-foreground">Save a job from the opportunity board to start tracking it here.</p><Button className="mt-6" asChild><Link to="/">Browse current jobs</Link></Button></div> : <div className="mt-8 grid gap-4">{items.map((item) => <ApplicationCard key={item.id} item={item} saving={savingId === item.id} onUpdate={updateItem} onRemove={removeItem} />)}</div>}
      </div>
    </main>
  );
}

function ApplicationCard({ item, saving, onUpdate, onRemove }: { item: TrackerItem; saving: boolean; onUpdate: (item: TrackerItem, changes: Partial<Application>) => void; onRemove: (item: TrackerItem) => void }) {
  const job = item.job;
  return (
    <article className="border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
              {job?.source_name ?? "Government job"}
            </span>
            <span className="text-xs text-muted-foreground">
              {job?.organization ?? "This listing is no longer active"}
            </span>
          </div>
          <h2 className="mt-3 font-display text-xl font-bold">
            {job?.title ?? "Saved government opportunity"}
          </h2>
          {job && (
            <p className="mt-2 text-sm text-muted-foreground">
              {job.location} · Last date {new Date(`${job.last_date}T12:00:00`).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Select
            value={item.status}
            onValueChange={(status) => onUpdate(item, {
              status,
              applied_at: status === "Applied" && !item.applied_at ? new Date().toISOString() : item.applied_at,
            })}
          >
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {statuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
            </SelectContent>
          </Select>
          {job && (
            <Button variant="outline" size="icon" asChild>
              <a href={job.apply_url} target="_blank" rel="noreferrer" aria-label="Open official application">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Input
          value={item.notes ?? ""}
          placeholder="Add a note, exam date, or reminder"
          onChange={(event) => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, notes: event.target.value } : entry))}
          onBlur={(event) => onUpdate(item, { notes: event.target.value })}
        />
        <Button variant="ghost" size="icon" onClick={() => onRemove(item)} disabled={saving} aria-label="Remove from tracker">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      {saving && <p className="mt-2 text-xs text-muted-foreground">Saving…</p>}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="min-w-[74px] border-l border-border pl-3"><p className="font-display text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>; }