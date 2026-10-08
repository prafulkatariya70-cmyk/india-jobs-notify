import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Landmark, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfile, updateProfile } from "@/lib/gov-api";

const educationOptions = ["10th pass", "12th pass", "Diploma", "Graduate", "Postgraduate", "Any qualification"];

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [
    { title: "Candidate details — Rozgaar" },
    { name: "description", content: "Save your qualifications and preferences to receive relevant open government job recommendations." },
    { property: "og:title", content: "Candidate details — Rozgaar" },
    { property: "og:description", content: "Save your qualifications and preferences for more relevant government job matches." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [education, setEducation] = useState("Graduate");
  const [field, setField] = useState("");
  const [experience, setExperience] = useState("0");
  const [state, setState] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { await navigate({ to: "/auth" }); return; }
      setUserId(data.user.id);
      try {
        const profile = await fetchProfile();
        setDisplayName(profile.full_name ?? "");
        setEducation(profile.education_level ?? "Graduate");
        setField([profile.degree, profile.branch].filter(Boolean).join(" · "));
        setExperience(String(profile.experience_years ?? 0));
        setState(profile.state ?? "");
        setCategory(profile.category ?? "");
      } catch {
        // New candidates can start with an empty profile.
      }
      setBusy(false);
    })();
  }, [navigate]);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;
    setBusy(true);
    setError("");
    setSaved(false);

    const parts = field.split("·").map((item) => item.trim()).filter(Boolean);
    try {
      await updateProfile({
        full_name: displayName.trim() || null,
        education_level: education,
        degree: parts[0] || field.trim() || null,
        branch: parts[1] || null,
        state: state.trim() || null,
        category: category.trim() || null,
        experience_years: Math.max(0, Math.min(60, Number(experience) || 0)),
      });
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save your details.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-secondary/30 px-5 py-8 text-foreground sm:py-12">
      <div className="mx-auto max-w-[920px]">
        <div className="flex items-center justify-between">
          <Link to="/applications" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to applications</Link>
          <Link to="/" className="flex items-center gap-2 font-display font-bold"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground"><Landmark className="h-4 w-4" /></span>Rozgaar</Link>
        </div>
        <section className="mt-10 border border-border bg-card p-6 shadow-[0_24px_70px_-42px_hsl(var(--foreground)/0.4)] sm:p-10">
          <p className="text-sm font-semibold text-primary">PERSONALIZED JOB MATCHING</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-[-0.04em]">Tell us what you’re looking for.</h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Your details stay private and help Rozgaar surface active openings that fit your education, location and interests.</p>
          <form onSubmit={save} className="mt-10 space-y-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <div><label htmlFor="display-name" className="mb-1.5 block text-sm font-medium">Name</label><Input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" /></div>
              <div><label htmlFor="education" className="mb-1.5 block text-sm font-medium">Highest education</label><Select value={education} onValueChange={setEducation}><SelectTrigger id="education"><SelectValue /></SelectTrigger><SelectContent>{educationOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
              <div><label htmlFor="field" className="mb-1.5 block text-sm font-medium">Degree / branch</label><Input id="field" value={field} onChange={(event) => setField(event.target.value)} placeholder="e.g. B.E. · Electrical & Electronics" /></div>
              <div><label htmlFor="experience" className="mb-1.5 block text-sm font-medium">Experience in years</label><Input id="experience" type="number" min="0" max="60" value={experience} onChange={(event) => setExperience(event.target.value)} /></div>
              <div><label htmlFor="state" className="mb-1.5 block text-sm font-medium">Preferred state</label><Input id="state" value={state} onChange={(event) => setState(event.target.value)} placeholder="e.g. Karnataka or All India" /></div>
              <div><label htmlFor="category" className="mb-1.5 block text-sm font-medium">Preferred category</label><Input id="category" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="e.g. Engineering" /></div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {saved && <p className="flex items-center gap-2 text-sm text-accent-foreground"><CheckCircle2 className="h-4 w-4" /> Your matching details are saved.</p>}
            <Button type="submit" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save details</Button>
          </form>
        </section>
      </div>
    </main>
  );
}
