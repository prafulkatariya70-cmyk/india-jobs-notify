import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  Filter,
  GraduationCap,
  Landmark,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fetchIngestionStatus, fetchJobs, fetchRecommendedJobs, createApplication, type GovJob } from "@/lib/gov-api";

type Job = GovJob & {
  level: "Central" | "State";
  organization: string;
  category: string;
  state: string;
  location: string;
  qualification: string;
  vacancies: number;
  last_date: string;
  salary: string;
  apply_url: string;
  source_url: string;
  tags: string[];
  is_featured: boolean;
};

function toUiJob(job: GovJob): Job {
  const isState = /kpsc|karnataka|state/i.test(job.source_name ?? "") || /karnataka/i.test(job.eligibility?.eligible_states ?? "");
  const qualification = job.eligibility?.qualification_text || job.eligibility?.degree || job.eligibility?.education_level || "See official notification";
  const state = job.eligibility?.eligible_states || "All India";
  const category = job.opportunity_type.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  return {
    ...job,
    level: isState ? "State" : "Central",
    organization: job.organization_name,
    category,
    state,
    location: state,
    qualification,
    vacancies: 0,
    last_date: job.application_end ?? job.application_start ?? job.created_at.slice(0, 10),
    salary: "See official notification",
    apply_url: job.official_url,
    source_url: job.official_url,
    tags: [job.opportunity_type, ...(job.eligibility?.branch ? [job.eligibility.branch] : [])],
    is_featured: job.is_closing_soon,
  };
}

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      const [{ items, total }, ingestion] = await Promise.all([
        fetchJobs({ page: 1, limit: 20 }),
        fetchIngestionStatus(),
      ]);
      return { jobs: items.map(toUiJob), total, sources: ingestion.sources };
    } catch {
      return { jobs: [], total: 0, sources: [] };
    }
  },
  head: () => ({
    meta: [
      { title: "Rozgaar — Government Jobs in India" },
      { name: "description", content: "Find verified central and state government jobs in India, with deadlines, eligibility and official application links." },
      { property: "og:title", content: "Rozgaar — Government Jobs in India" },
      { property: "og:description", content: "A clear, verified directory of central and state government vacancies across India." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { jobs: initialJobs, total: initialTotal, sources } = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [state, setState] = useState("all");
  const [category, setCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [total, setTotal] = useState(initialTotal);
  const [recommendations, setRecommendations] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data.user?.email ?? null);
      if (!data.user) return;
      try {
        const recommended = await fetchRecommendedJobs();
        setRecommendations(recommended.slice(0, 3).map(toUiJob));
      } catch {
        setRecommendations([]);
      }
    })();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoadingJobs(true);
        setApiError(null);
        try {
          const result = await fetchJobs({
            search: query,
            opportunityType: category === "all" ? undefined : category.replaceAll(" ", "_").toUpperCase(),
            eligibleState: state === "all" ? undefined : state,
            page: 1,
            limit: 20,
          });
          let next = result.items.map(toUiJob);
          if (level !== "all") next = next.filter((job) => job.level === level);
          if (state !== "all") next = next.filter((job) => job.state.toLowerCase().includes(state.toLowerCase()));
          setJobs(next);
          setTotal(result.total);
        } catch (error) {
          setApiError(error instanceof Error ? error.message : "Unable to load jobs.");
        } finally {
          setLoadingJobs(false);
        }
      })();
    }, query.trim() ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [query, level, state, category]);

  const filteredJobs = jobs;
  const centralCount = jobs.filter((job) => job.level === "Central").length;
  const stateCount = jobs.filter((job) => job.level === "State").length;
  const states = ["Karnataka", "Maharashtra", "Gujarat", "Tamil Nadu", "Uttar Pradesh", "West Bengal"];
  const categories = Array.from(new Set(jobs.map((job) => job.category))).sort();
  const activeFilterCount = [level !== "all", state !== "all", category !== "all"].filter(Boolean).length;

  const clearFilters = () => {
    setQuery("");
    setLevel("all");
    setState("all");
    setCategory("all");
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
          <a href="#top" className="flex items-center gap-3" aria-label="Rozgaar home">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Landmark className="h-5 w-5" />
            </span>
            <span className="font-display text-[21px] font-bold tracking-[-0.02em]">Rozgaar</span>
          </a>
          <div className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a className="text-foreground" href="#jobs">Browse jobs</a>
            <a className="transition-colors hover:text-foreground" href="#sources">Official sources</a>
            <a className="transition-colors hover:text-foreground" href="#how-it-works">How it works</a>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            {userEmail ? <><Button variant="outline" size="sm" className="gap-2" asChild><Link to="/applications"><UserRound className="h-4 w-4" /> My applications</Link></Button><Button variant="ghost" size="sm" asChild><Link to="/profile">My details</Link></Button></> : <Button variant="outline" size="sm" className="gap-2" asChild><Link to="/auth"><UserRound className="h-4 w-4" /> Sign in</Link></Button>}
            <Button size="sm" asChild><a href="#jobs">Find a job <ArrowUpRight className="h-4 w-4" /></a></Button>
          </div>
          <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setMobileNav((open) => !open)} aria-label="Open menu">
            {mobileNav ? <X /> : <Menu />}
          </Button>
        </div>
        {mobileNav && <div className="border-t border-border px-5 py-4 sm:hidden"><div className="flex flex-col gap-4 text-sm font-medium"><a href="#jobs">Browse jobs</a><a href="#sources">Official sources</a><a href="#how-it-works">How it works</a></div></div>}
      </nav>

      <section id="top" className="relative overflow-hidden border-b border-border bg-secondary/35">
        <div className="absolute inset-y-0 right-0 hidden w-[42%] bg-primary/[0.035] lg:block" />
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-16 lg:grid-cols-[1fr_420px] lg:items-center lg:px-8 lg:py-[88px]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background px-3 py-1.5 text-xs font-semibold text-primary shadow-sm">
              <Sparkles className="h-3.5 w-3.5" /> Updated from official sources
            </div>
            <h1 className="max-w-[680px] font-display text-4xl font-bold leading-[1.08] tracking-[-0.045em] text-foreground sm:text-5xl lg:text-[62px]">Your next government job starts here.</h1>
            <p className="mt-6 max-w-[600px] text-lg leading-8 text-muted-foreground">A simpler way to discover verified central and state government opportunities — without missing the deadline.</p>
            <div className="mt-9 flex max-w-[640px] flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search jobs, departments, exams..." className="h-12 border-border bg-background pl-11 text-sm shadow-sm" />
              </div>
              <Button size="lg" className="h-12 px-6" onClick={() => document.getElementById("jobs")?.scrollIntoView({ behavior: "smooth" })}>Search jobs <Search className="h-4 w-4" /></Button>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-accent-foreground" /> Official links only</span><span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-accent-foreground" /> No misleading listings</span></div>
          </div>
          <div className="relative hidden lg:block">
            <div className="absolute -inset-6 rounded-[28px] border border-primary/10 bg-background/40" />
            <div className="relative rounded-2xl border border-border bg-card p-6 shadow-[0_18px_50px_-24px_hsl(var(--foreground)/0.28)]">
              <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">Today on Rozgaar</p><p className="mt-2 font-display text-3xl font-bold">{totalVacancies.toLocaleString("en-IN")}+</p><p className="mt-1 text-sm text-muted-foreground">open opportunities listed</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground"><BriefcaseBusiness className="h-5 w-5" /></span></div>
              <div className="my-6 border-t border-border" />
              <div className="space-y-4"><MiniSource label="Central government" value={`${centralCount} active listings`} tone="primary" /><MiniSource label="State government" value={`${stateCount} active listings`} tone="accent" /><MiniSource label="Sources monitored" value={`${sources.length} official portals`} tone="secondary" /></div>
              <div className="mt-6 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2.5 text-xs text-secondary-foreground"><span className="h-2 w-2 rounded-full bg-accent-foreground" /> Auto-checked every 30 minutes</div>
            </div>
          </div>
        </div>
      </section>

      {userEmail && <section className="border-b border-border bg-secondary/30"><div className="mx-auto max-w-[1240px] px-5 py-12 lg:px-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-primary">MADE FOR YOUR SEARCH</p><h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.03em]">Recommended for you</h2><p className="mt-2 text-sm text-muted-foreground">Open roles matched to the details in your candidate profile.</p></div><Button variant="outline" size="sm" asChild><Link to="/profile">Update my details</Link></Button></div>{recommendations.length > 0 ? <div className="mt-7 grid gap-4 lg:grid-cols-3">{recommendations.map((job) => <RecommendationCard key={job.id} job={job} />)}</div> : <div className="mt-7 border border-dashed border-border bg-background p-6"><p className="font-semibold">Complete your candidate details to unlock recommendations.</p><p className="mt-1 text-sm text-muted-foreground">Add your education, preferred state and job category.</p><Button className="mt-4" size="sm" asChild><Link to="/profile">Add details</Link></Button></div>}</div></section>}

      <section className="border-b border-border bg-background"><div className="mx-auto grid max-w-[1240px] divide-y border-x border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0"><Stat icon={<BriefcaseBusiness />} label="Active opportunities" value={total.toLocaleString("en-IN")} /><Stat icon={<UsersRound />} label="Vacancies across India" value="Live listings" /><Stat icon={<ShieldCheck />} label="Verified source portals" value={sources.length.toString()} /></div></section>

      <section id="jobs" className="mx-auto max-w-[1240px] scroll-mt-10 px-5 py-14 lg:px-8 lg:py-20">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-primary">THE OPPORTUNITY BOARD</p><h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Latest government jobs</h2><p className="mt-3 text-sm text-muted-foreground">Fresh openings, clear deadlines, direct official application links.</p></div><Button variant="outline" className="w-fit" onClick={() => setShowFilters((open) => !open)}><Filter className="h-4 w-4" /> Filters {activeFilterCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] text-primary-foreground">{activeFilterCount}</span>}<ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} /></Button></div>
        {apiError && <div className="mt-6 border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{apiError}</div>}
        <div className="mt-8 flex flex-col gap-3 lg:flex-row"><div className="relative flex-1"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, organization or keyword" className="pl-10" /></div><Select value={level} onValueChange={setLevel}><SelectTrigger className="w-full lg:w-[180px]"><SelectValue placeholder="All job types" /></SelectTrigger><SelectContent><SelectItem value="all">All job types</SelectItem><SelectItem value="Central">Central jobs</SelectItem><SelectItem value="State">State jobs</SelectItem></SelectContent></Select><Select value={state} onValueChange={setState}><SelectTrigger className="w-full lg:w-[180px]"><SelectValue placeholder="All locations" /></SelectTrigger><SelectContent><SelectItem value="all">All locations</SelectItem>{states.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
        {showFilters && <div className="mt-3 flex flex-col gap-3 rounded-xl border border-border bg-secondary/35 p-4 sm:flex-row sm:items-center"><span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Filter className="h-3.5 w-3.5" /> Refine by category</span><Select value={category} onValueChange={setCategory}><SelectTrigger className="w-full bg-background sm:w-[220px]"><SelectValue placeholder="All categories" /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>{activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear all</Button>}</div>}
        <div className="mt-8 grid gap-4 lg:grid-cols-2">{loadingJobs ? <div className="lg:col-span-2 flex items-center justify-center border border-dashed border-border py-16 text-sm text-muted-foreground">Refreshing live openings…</div> : filteredJobs.map((job) => <JobCard key={job.id} job={job} />)}</div>
         {!loadingJobs && filteredJobs.length === 0 && <div className="border border-dashed border-border py-16 text-center"><Search className="mx-auto h-8 w-8 text-muted-foreground" /><h3 className="mt-4 font-display text-xl font-semibold">No jobs match your search</h3><p className="mt-2 text-sm text-muted-foreground">Try a different keyword or clear your filters.</p><Button variant="outline" className="mt-5" onClick={clearFilters}>Clear filters</Button></div>}
        <div className="mt-10 flex justify-center"><div className="flex flex-col items-center gap-2"><Button variant="outline" onClick={clearFilters}>Reset search <ArrowUpRight className="h-4 w-4" /></Button><span className="text-xs text-muted-foreground">{total.toLocaleString("en-IN")} live/upcoming opportunities</span></div></div>
      </section>

      <section id="sources" className="border-y border-border bg-secondary/30"><div className="mx-auto max-w-[1240px] px-5 py-14 lg:px-8 lg:py-20"><div className="max-w-2xl"><p className="text-sm font-semibold text-primary">BUILT ON TRUST</p><h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.03em] sm:text-4xl">We watch the official portals, so you don’t have to.</h2><p className="mt-4 leading-7 text-muted-foreground">Every listing points back to the recruiting body that published it. Rozgaar keeps the important details in one place and makes the final step clear.</p></div><div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{sources.map((source) => <a key={source.id} href={source.base_url} target="_blank" rel="noreferrer" className="group flex items-center justify-between border border-border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-card"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-secondary-foreground">{source.name.slice(0, 3)}</span><div><p className="text-sm font-semibold">{source.name}</p><p className="mt-1 text-xs text-muted-foreground">{source.health_status === "healthy" ? "Healthy source" : "Source needs attention"}</p></div></div><ExternalLink className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" /></a>)}</div></div></section>

      <section id="how-it-works" className="mx-auto max-w-[1240px] px-5 py-14 lg:px-8 lg:py-20"><div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div><p className="text-sm font-semibold text-primary">A CLEARER WAY TO APPLY</p><h2 className="mt-2 max-w-md font-display text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Less noise. More confidence.</h2><p className="mt-4 max-w-md leading-7 text-muted-foreground">From discovery to application, every part of the experience is designed for one thing: helping you take the next right step.</p></div><div className="grid gap-3 sm:grid-cols-3"><Step number="01" icon={<Search />} title="Discover" text="Search opportunities that match your skills and location." /><Step number="02" icon={<GraduationCap />} title="Understand" text="See eligibility, vacancies, salary and the closing date." /><Step number="03" icon={<ArrowUpRight />} title="Apply" text="Continue to the official portal with confidence." /></div></div></section>

      <footer className="border-t border-border bg-primary text-primary-foreground"><div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-5 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8"><div><div className="flex items-center gap-2 font-display text-lg font-bold"><Landmark className="h-5 w-5" /> Rozgaar</div><p className="mt-1 text-xs text-primary-foreground/70">Making public opportunities easier to find.</p></div><p className="text-xs text-primary-foreground/70">Always verify details on the official notification before applying.</p></div></footer>
    </main>
  );
}

function MiniSource({ label, value, tone }: { label: string; value: string; tone: "primary" | "accent" | "secondary" }) {
  return <div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><span className={`h-2.5 w-2.5 rounded-full ${tone === "primary" ? "bg-primary" : tone === "accent" ? "bg-accent-foreground" : "bg-muted-foreground"}`} /><span className="text-sm text-muted-foreground">{label}</span></div><span className="text-sm font-semibold">{value}</span></div>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="flex items-center gap-4 px-5 py-5 lg:px-8"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">{icon}</span><div><p className="font-display text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></div>;
}

function JobCard({ job }: { job: Job }) {
  const daysLeft = Math.max(0, Math.ceil((new Date(`${job.last_date}T23:59:59`).getTime() - Date.now()) / 86400000));
  return <article className="group border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_12px_35px_-24px_hsl(var(--foreground)/0.45)] sm:p-6"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Landmark className="h-5 w-5" /></span><div><div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant={job.level === "Central" ? "default" : "secondary"}>{job.level}</Badge>{job.is_featured && <Badge variant="outline">Featured</Badge>}</div><h3 className="font-display text-lg font-bold leading-snug tracking-[-0.02em]"><Link to="/jobs/$id" params={{ id: String(job.id) }} className="hover:text-primary">{job.title}</Link></h3><p className="mt-1 text-sm text-muted-foreground">{job.organization}</p></div></div><span className="hidden rounded-md bg-accent/60 px-2 py-1 text-[11px] font-semibold text-accent-foreground sm:block">{job.source_name} verified</span></div><div className="mt-5 grid grid-cols-2 gap-3 border-y border-border py-4 text-xs sm:grid-cols-4"><Detail icon={<MapPin />} label="Location" value={job.location} /><Detail icon={<GraduationCap />} label="Qualification" value={job.qualification} /><Detail icon={<UsersRound />} label="Vacancies" value="See notification" /><Detail icon={<CalendarDays />} label="Last date" value={new Date(`${job.last_date}T12:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} /></div><div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs text-muted-foreground">Pay scale</p><p className="mt-1 text-sm font-semibold">{job.salary}</p><p className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${daysLeft <= 10 ? "text-destructive" : "text-muted-foreground"}`}><Clock3 className="h-3.5 w-3.5" /> {daysLeft === 0 ? "Deadline passed" : `${daysLeft} days left to apply`}</p></div><div className="flex gap-2"><SaveJobButton job={job} /><Button variant="outline" size="sm" asChild><Link to="/jobs/$id" params={{ id: job.id }}>Details</Link></Button><Button size="sm" asChild><a href={job.apply_url} target="_blank" rel="noreferrer">Apply <ExternalLink className="h-3.5 w-3.5" /></a></Button></div></div></article>;
}

function RecommendationCard({ job }: { job: Job }) {
  return <article className="border border-border bg-card p-5"><div className="flex items-center justify-between gap-3"><Badge variant={job.level === "Central" ? "default" : "secondary"}>{job.level}</Badge><span className="text-xs text-muted-foreground">{job.source_name}</span></div><h3 className="mt-4 font-display text-lg font-bold"><Link to="/jobs/$id" params={{ id: job.id }} className="hover:text-primary">{job.title}</Link></h3><p className="mt-1 text-sm text-muted-foreground">{job.organization}</p><p className="mt-4 text-xs font-medium text-accent-foreground">{job.category} · {job.location}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(`${job.last_date}T12:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} deadline</p><Button className="mt-5 w-full" variant="outline" size="sm" asChild><Link to="/jobs/$id" params={{ id: job.id }}>Review match <ArrowUpRight className="h-3.5 w-3.5" /></Link></Button></article>;
}

function SaveJobButton({ job }: { job: Job }) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { await navigate({ to: "/auth" }); setBusy(false); return; }
    try {
      await createApplication({ job_id: job.id, status: "Saved" });
      setSaved(true);
    } catch {
      // Keep the button retryable when the API is temporarily unavailable.
    }
    setBusy(false);
  };
  return <Button size="sm" variant={saved ? "secondary" : "outline"} onClick={save} disabled={busy || saved}>{saved ? "Saved" : "Save job"}</Button>;
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="min-w-0"><div className="flex items-center gap-1.5 text-muted-foreground"><span className="[&_svg]:h-3 [&_svg]:w-3">{icon}</span><span>{label}</span></div><p className="mt-1 truncate font-medium text-foreground" title={value}>{value}</p></div>;
}

function Step({ number, icon, title, text }: { number: string; icon: React.ReactNode; title: string; text: string }) {
  return <div className="border border-border bg-card p-5"><div className="flex items-center justify-between"><span className="text-xs font-bold text-primary">{number}</span><span className="text-primary">{icon}</span></div><h3 className="mt-8 font-display text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>;
}