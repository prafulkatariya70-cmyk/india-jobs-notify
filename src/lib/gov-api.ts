import { supabase } from "@/integrations/supabase/client";
export type JobEligibility = {
  minimum_age: number | null;
  maximum_age: number | null;
  education_level: string | null;
  degree: string | null;
  branch: string | null;
  qualification_text: string | null;
  eligible_states: string | null;
  eligible_categories: string | null;
};

export type GovJob = {
  id: number;
  title: string;
  organization_name: string;
  description: string | null;
  official_url: string;
  notification_url: string | null;
  application_start: string | null;
  application_end: string | null;
  status: string;
  opportunity_type: string;
  source_name: string | null;
  created_at: string;
  lifecycle_status: string;
  is_open: boolean;
  is_upcoming: boolean;
  is_closing_soon: boolean;
  days_until_deadline: number | null;
  eligibility: JobEligibility | null;
};

export type JobListResponse = {
  items: GovJob[];
  total: number;
  page: number;
  limit: number;
};

export type Profile = {
  user_id: number;
  full_name: string | null;
  email: string;
  date_of_birth: string | null;
  state: string | null;
  education_level: string | null;
  degree: string | null;
  branch: string | null;
  graduation_year: number | null;
  category: string | null;
  experience_years: number;
};

export type Application = {
  id: number;
  job_id: number;
  status: string;
  notes: string | null;
  application_number: string | null;
  roll_number: string | null;
  exam_center: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
  job: GovJob | null;
};

export type IngestionSource = {
  id: number;
  name: string;
  base_url: string;
  health_status: string;
  is_active: boolean;
  last_checked_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  latest_run_status: string | null;
  latest_run_created: number;
  latest_run_updated: number;
  latest_run_failed: number;
  latest_run_error: string | null;
};

export type IngestionStatus = {
  sources: IngestionSource[];
  latest_run_at: string | null;
  jobs_count: number;
};

const configuredBaseUrl = import.meta.env.VITE_GOV_API_URL?.trim();

function getBaseUrl() {
  if (configuredBaseUrl) return configuredBaseUrl.replace(/\/$/, "");
  if (import.meta.env.DEV) return "http://localhost:8000/api";
  throw new Error("Rozgaar API is not configured. Set VITE_GOV_API_URL to the Gov-AI API URL.");
}

function getClientId() {
  const key = "rozgaar_client_id";
  try {
    const existing = window.localStorage.getItem(key);
    if (existing && existing.length >= 16) return existing;
    const id = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : String(Date.now()) + "-" + Math.random().toString(36).slice(2) + "-" + Math.random().toString(36).slice(2);
    window.localStorage.setItem(key, id);
    return id;
  } catch {
    return "rozgaar-anonymous-client";
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  headers.set("X-Client-ID", getClientId());

  if (typeof window !== "undefined") {
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (accessToken) headers.set("Authorization", "Bearer " + accessToken);
    } catch {
      // Public endpoints remain usable when an auth session is unavailable.
    }
  }

  const response = await fetch(getBaseUrl() + path, {
    ...init,
    headers,
    credentials: "omit",
  });

  if (!response.ok) {
    let detail = "API request failed (" + response.status + ")";
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      // Keep the HTTP status message when the API did not return JSON.
    }
    throw new Error(detail);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function fetchJobs(params: {
  search?: string;
  sourceName?: string;
  opportunityType?: string;
  eligibleState?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.sourceName) query.set("source_name", params.sourceName);
  if (params.opportunityType) query.set("opportunity_type", params.opportunityType);
  if (params.eligibleState) query.set("eligible_state", params.eligibleState);
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 20));
  return apiFetch<JobListResponse>("/jobs?" + query.toString());
}

export const fetchJob = (id: string | number) => apiFetch<GovJob>("/jobs/" + id);
export const fetchRecommendedJobs = () => apiFetch<Array<GovJob & {
  eligibility_status: string;
  match_score: number;
  eligibility_reasons: string[];
}>>("/jobs/recommended");
export const fetchProfile = () => apiFetch<Profile>("/profile");
export const updateProfile = (payload: Record<string, unknown>) =>
  apiFetch<Profile>("/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
export const fetchApplications = () => apiFetch<Application[]>("/applications");
export const createApplication = (payload: Record<string, unknown>) =>
  apiFetch<Application>("/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
export const updateApplication = (id: number, payload: Record<string, unknown>) =>
  apiFetch<Application>("/applications/" + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
export const deleteApplication = (id: number) =>
  apiFetch<void>("/applications/" + id, { method: "DELETE" });
export const fetchIngestionStatus = () => apiFetch<IngestionStatus>("/ingestion/status");

export { getClientId };
