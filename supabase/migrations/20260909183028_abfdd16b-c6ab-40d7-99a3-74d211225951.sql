CREATE TABLE public.job_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL CHECK (scope IN ('Central', 'State')),
  state TEXT,
  website_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Watching' CHECK (status IN ('Watching', 'Syncing', 'Paused')),
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.job_sources TO anon;
GRANT ALL ON public.job_sources TO service_role;
ALTER TABLE public.job_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can browse official sources" ON public.job_sources FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.govt_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  organization TEXT NOT NULL,
  location TEXT NOT NULL,
  state TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('Central', 'State')),
  category TEXT NOT NULL,
  vacancies INTEGER NOT NULL DEFAULT 0,
  qualification TEXT NOT NULL,
  salary TEXT NOT NULL,
  posted_date DATE NOT NULL,
  last_date DATE NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  apply_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.govt_jobs TO anon;
GRANT ALL ON public.govt_jobs TO service_role;
ALTER TABLE public.govt_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can browse active government jobs" ON public.govt_jobs FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE TABLE public.job_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES public.job_sources(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Started', 'Completed', 'Failed')),
  jobs_found INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
GRANT SELECT ON public.job_sync_runs TO authenticated;
GRANT ALL ON public.job_sync_runs TO service_role;
ALTER TABLE public.job_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can view sync health" ON public.job_sync_runs FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_job_directory_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_job_sources_updated_at BEFORE UPDATE ON public.job_sources FOR EACH ROW EXECUTE FUNCTION public.update_job_directory_timestamps();
CREATE TRIGGER update_govt_jobs_updated_at BEFORE UPDATE ON public.govt_jobs FOR EACH ROW EXECUTE FUNCTION public.update_job_directory_timestamps();

INSERT INTO public.job_sources (name, short_name, scope, state, website_url, status, last_checked_at) VALUES
  ('Union Public Service Commission', 'UPSC', 'Central', NULL, 'https://upsc.gov.in/', 'Watching', now()),
  ('Staff Selection Commission', 'SSC', 'Central', NULL, 'https://ssc.gov.in/', 'Watching', now()),
  ('Railway Recruitment Boards', 'RRB', 'Central', NULL, 'https://www.rrbcdg.gov.in/', 'Watching', now()),
  ('Bihar Public Service Commission', 'BPSC', 'State', 'Bihar', 'https://www.bpsc.bih.nic.in/', 'Watching', now()),
  ('Maharashtra Public Service Commission', 'MPSC', 'State', 'Maharashtra', 'https://mpsc.gov.in/', 'Watching', now()),
  ('Rajasthan Public Service Commission', 'RPSC', 'State', 'Rajasthan', 'https://rpsc.rajasthan.gov.in/', 'Watching', now());

INSERT INTO public.govt_jobs (title, organization, location, state, level, category, vacancies, qualification, salary, posted_date, last_date, source_name, source_url, apply_url, is_featured, tags) VALUES
  ('Civil Services Examination 2026', 'Union Public Service Commission', 'Across India', 'All India', 'Central', 'Civil Services', 979, 'Any graduate', '₹56,100 – ₹1,77,500', '2026-02-14', '2026-03-03', 'UPSC', 'https://upsc.gov.in/', 'https://upsconline.nic.in/', true, ARRAY['IAS', 'IPS', 'IFS', 'Graduate']),
  ('Combined Defence Services Examination II', 'Union Public Service Commission', 'Across India', 'All India', 'Central', 'Defence', 453, 'Graduate', '₹56,100 – ₹1,77,500', '2026-05-20', '2026-06-09', 'UPSC', 'https://upsc.gov.in/', 'https://upsconline.nic.in/', true, ARRAY['Defence', 'CDS', 'Graduate']),
  ('Constable (General Duty) Recruitment', 'Staff Selection Commission', 'Across India', 'All India', 'Central', 'Police & Paramilitary', 25487, '10th pass', '₹21,700 – ₹69,100', '2026-05-18', '2026-06-17', 'SSC', 'https://ssc.gov.in/', 'https://ssc.gov.in/', true, ARRAY['SSC', 'Police', '10th Pass']),
  ('Junior Engineer Recruitment 2026', 'Staff Selection Commission', 'Across India', 'All India', 'Central', 'Engineering', 1765, 'Diploma / Engineering degree', '₹35,400 – ₹1,12,400', '2026-04-28', '2026-05-25', 'SSC', 'https://ssc.gov.in/', 'https://ssc.gov.in/', false, ARRAY['SSC', 'Engineering', 'Diploma']),
  ('Assistant Loco Pilot', 'Railway Recruitment Boards', 'Multiple Railway Zones', 'All India', 'Central', 'Railways', 18799, '10th + ITI / Diploma', '₹19,900 – ₹63,200', '2026-04-15', '2026-05-14', 'RRB', 'https://www.rrbcdg.gov.in/', 'https://www.rrbcdg.gov.in/', false, ARRAY['Railways', 'ITI', 'Technical']),
  ('Police Sub-Inspector Recruitment', 'Bihar Police Subordinate Services Commission', 'Bihar', 'Bihar', 'State', 'Police & Paramilitary', 1799, 'Any graduate', '₹35,400 – ₹1,12,400', '2026-05-28', '2026-06-27', 'BPSC', 'https://www.bpsc.bih.nic.in/', 'https://bpssc.bihar.gov.in/', true, ARRAY['Bihar', 'Police', 'Graduate']),
  ('State Services Examination 2026', 'Maharashtra Public Service Commission', 'Maharashtra', 'Maharashtra', 'State', 'Civil Services', 274, 'Any graduate', '₹41,800 – ₹1,32,300', '2026-05-24', '2026-06-23', 'MPSC', 'https://mpsc.gov.in/', 'https://mpsc.gov.in/', false, ARRAY['Maharashtra', 'MPSC', 'Graduate']),
  ('School Lecturer Recruitment', 'Rajasthan Public Service Commission', 'Rajasthan', 'Rajasthan', 'State', 'Teaching', 2202, 'Postgraduate + B.Ed', '₹44,300 – ₹1,40,100', '2026-05-30', '2026-06-29', 'RPSC', 'https://rpsc.rajasthan.gov.in/', 'https://rpsc.rajasthan.gov.in/', false, ARRAY['Rajasthan', 'Teaching', 'Postgraduate']);