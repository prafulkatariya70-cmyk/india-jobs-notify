import type { Tables } from "@/integrations/supabase/types";

export type Job = Tables<"govt_jobs">;
export type CandidateProfile = Tables<"profiles">;

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function jobMatchScore(job: Job, profile: CandidateProfile) {
  let score = 0;
  const qualification = normalize(job.qualification);
  const education = normalize(profile.education_level ?? "");
  const field = normalize(profile.field_of_study ?? "");
  const searchable = normalize([job.title, job.category, job.qualification, ...job.tags].join(" "));

  if (profile.preferred_categories.includes(job.category)) score += 30;
  if (profile.preferred_states.includes(job.state) || (job.state === "All India" && profile.preferred_states.length > 0)) score += 20;
  if (education && (qualification.includes(education) || qualification.includes("any graduate") || education.includes("graduate") && qualification.includes("graduate"))) score += 30;
  if (field && searchable.includes(field)) score += 10;
  if (profile.skills.some((skill) => skill.trim() && searchable.includes(normalize(skill)))) score += 10;

  return score;
}

export function getRecommendedJobs(jobs: Job[], profile: CandidateProfile) {
  return jobs
    .map((job) => ({ job, score: jobMatchScore(job, profile) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.job.last_date.localeCompare(b.job.last_date))
    .map(({ job }) => job);
}

export function recommendationReason(job: Job, profile: CandidateProfile) {
  if (profile.preferred_categories.includes(job.category)) return `Matches your ${job.category} preference`;
  if (profile.preferred_states.includes(job.state) || job.state === "All India") return "Matches your preferred location";
  if (profile.skills.some((skill) => skill.trim() && normalize([job.title, job.category, job.qualification, ...job.tags].join(" ")).includes(normalize(skill)))) return "Uses one of your listed skills";
  return "Fits your saved qualification details";
}