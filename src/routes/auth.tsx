import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Landmark, Loader2, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SarkariSetu" },
      { name: "description", content: "Sign in to save government jobs and manage your SarkariSetu application tracker." },
      { property: "og:title", content: "Sign in — SarkariSetu" },
      { property: "og:description", content: "Save government jobs and keep your application progress in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const saveProfile = async (userId: string, name?: string | null, userEmail?: string | null) => {
    await supabase.from("profiles").upsert({
      user_id: userId,
      display_name: name?.trim() || userEmail?.split("@")[0] || "SarkariSetu user",
    }, { onConflict: "user_id" });
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: displayName } },
        });
        if (signUpError) throw signUpError;
        if (data.user && data.session) await saveProfile(data.user.id, displayName, data.user.email);
        setMessage("Account created. Check your email to confirm your address before signing in.");
        setMode("signin");
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        if (data.user) await saveProfile(data.user.id, null, data.user.email);
        await navigate({ to: "/applications" });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to continue. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setBusy(true);
    setError("");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result?.error) setError(result.error.message);
    else if (!result?.redirected) await navigate({ to: "/applications" });
    setBusy(false);
  };

  return (
    <main className="min-h-screen bg-secondary/30 px-5 py-8 text-foreground sm:py-12">
      <div className="mx-auto max-w-[1080px]">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to jobs
        </Link>
        <div className="mt-10 grid overflow-hidden border border-border bg-card shadow-[0_24px_70px_-42px_hsl(var(--foreground)/0.4)] lg:grid-cols-[0.9fr_1.1fr]">
          <section className="bg-primary p-8 text-primary-foreground sm:p-12">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/15"><Landmark className="h-5 w-5" /></span><span className="font-display text-xl font-bold">SarkariSetu</span></div>
            <p className="mt-16 text-sm font-semibold uppercase tracking-[0.14em] text-primary-foreground/65">Your application desk</p>
            <h1 className="mt-4 max-w-md font-display text-4xl font-bold leading-tight tracking-[-0.04em] sm:text-5xl">Keep every opportunity within reach.</h1>
            <p className="mt-5 max-w-md leading-7 text-primary-foreground/75">Save jobs, mark your progress, and return to the official application link when you are ready.</p>
            <div className="mt-10 space-y-4 text-sm text-primary-foreground/85"><p className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-accent" /> Personal application tracker</p><p className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-accent" /> Notes for every saved job</p><p className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-accent" /> Your data stays private</p></div>
          </section>
          <section className="p-6 sm:p-12">
            <div className="max-w-md">
              <p className="text-sm font-semibold text-primary">WELCOME BACK</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-[-0.03em]">{mode === "signin" ? "Sign in to continue" : "Create your account"}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{mode === "signin" ? "Pick up where you left off with your saved jobs." : "Start a private workspace for your government job search."}</p>
              <Button type="button" variant="outline" className="mt-8 h-11 w-full gap-2" onClick={signInWithGoogle} disabled={busy}><span className="font-bold text-primary">G</span> Continue with Google</Button>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /><span>or use email</span><span className="h-px flex-1 bg-border" /></div>
              <form onSubmit={submit} className="space-y-4">
                {mode === "signup" && <div><label htmlFor="display-name" className="mb-1.5 block text-sm font-medium">Your name</label><Input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="e.g. Praful" autoComplete="name" required /></div>}
                <div><label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email address</label><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="pl-9" autoComplete="email" required /></div></div>
                <div><label htmlFor="password" className="mb-1.5 block text-sm font-medium">Password</label><div className="relative"><Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" className="pr-10" minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} required /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {message && <p className="text-sm text-accent-foreground">{message}</p>}
                <Button type="submit" className="h-11 w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "signin" ? "Sign in" : "Create account"}</Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">{mode === "signin" ? "New to SarkariSetu?" : "Already have an account?"}{" "}<button type="button" className="font-semibold text-primary hover:underline" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }}>{mode === "signin" ? "Create an account" : "Sign in"}</button></p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}