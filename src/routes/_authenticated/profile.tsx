import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Landmark, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

const educationOptions = ["10th pass", "12th pass", "Diploma", "Graduate", "Postgraduate", "Any qualification"];
const splitValues = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [
    { title: "Candidate details — SarkariSetu" },
    { name: "description", content: "Save your qualifications and preferences to receive relevant open government job recommendations." },
    { property: "og:title", content: "Candidate details — SarkariSetu" },
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
  const [skills, setSkills] = useState("");
  const [states, setStates] = useState("");
  const [categories, setCategories] = useState("");
  const [busy, setBusy] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { await navigate({ to: "/auth" }); return; }
      setUserId(data.user.id);
      const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", data.user.id).maybeSingle();
      if (profile) {
        setDisplayName(profile.display_name ?? ""); setEducation(profile.education_level ?? "Graduate"); setField(profile.field_of_study ?? ""); setExperience(String(profile.experience_years)); setSkills(profile.skills.join(", ")); setStates(profile.preferred_states.join(", ")); setCategories(profile.preferred_categories.join(", "));
      }
      setBusy(false);
    })();
  }, [navigate]);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;
    setBusy(true); setError(""); setSaved(false);
    const { error: saveError } = await supabase.from("profiles").upsert({ user_id: userId, display_name: displayName.trim() || null, education_level: education, field_of_study: field.trim() || null, experience_years: Math.max(0, Math.min(60, Number(experience) || 0)), skills: splitValues(skills), preferred_states: splitValues(states), preferred_categories: splitValues(categories) }, { onConflict: "user_id" });
    if (saveError) setError(saveError.message); else setSaved(true);
    setBusy(false);
  };

  return <main className="min-h-screen bg-secondary/30 px-5 py-8 text-foreground sm:py-12"><div className="mx-auto max-w-[920px]"><div className="flex items-center justify-between"><Link to="/applications" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to applications</Link><Link to="/" className="flex items-center gap-2 font-display font-bold"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground"><Landmark className="h-4 w-4" /></span>SarkariSetu</Link></div><section className="mt-10 border border-border bg-card p-6 shadow-[0_24px_70px_-42px_hsl(var(--foreground)/0.4)] sm:p-10"><p className="text-sm font-semibold text-primary">PERSONALIZED JOB MATCHING</p><h1 className="mt-2 font-display text-4xl font-bold tracking-[-0.04em]">Tell us what you’re looking for.</h1><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">Your details stay private and help us surface active openings that fit your education, skills, preferred locations and interests.</p><form onSubmit={save} className="mt-10 space-y-7"><div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="display-name" className="mb-1.5 block text-sm font-medium">Name</label><Input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" /></div><div><label htmlFor="education" className="mb-1.5 block text-sm font-medium">Highest education</label><Select value={education} onValueChange={setEducation}><SelectTrigger id="education"><SelectValue /></SelectTrigger><SelectContent>{educationOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div><div><label htmlFor="field" className="mb-1.5 block text-sm font-medium">Field of study</label><Input id="field" value={field} onChange={(event) => setField(event.target.value)} placeholder="e.g. Civil engineering, commerce" /></div><div><label htmlFor="experience" className="mb-1.5 block text-sm font-medium">Experience in years</label><Input id="experience" type="number" min="0" max="60" value={experience} onChange={(event) => setExperience(event.target.value)} /></div></div><div><label htmlFor="skills" className="mb-1.5 block text-sm font-medium">Skills</label><Textarea id="skills" value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="Type skills separated by commas, such as teaching, ITI, accounting" /><p className="mt-1.5 text-xs text-muted-foreground">Separate multiple skills with commas.</p></div><div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="states" className="mb-1.5 block text-sm font-medium">Preferred states</label><Input id="states" value={states} onChange={(event) => setStates(event.target.value)} placeholder="e.g. Maharashtra, All India" /></div><div><label htmlFor="categories" className="mb-1.5 block text-sm font-medium">Preferred job categories</label><Input id="categories" value={categories} onChange={(event) => setCategories(event.target.value)} placeholder="e.g. Teaching, Engineering" /></div></div>{error && <p className="text-sm text-destructive">{error}</p>}{saved && <p className="flex items-center gap-2 text-sm text-accent-foreground"><CheckCircle2 className="h-4 w-4" /> Your matching details are saved.</p>}<Button type="submit" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save details</Button></form></section></div></main>;
}