ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS education_level TEXT,
  ADD COLUMN IF NOT EXISTS field_of_study TEXT,
  ADD COLUMN IF NOT EXISTS experience_years INTEGER NOT NULL DEFAULT 0 CHECK (experience_years >= 0 AND experience_years <= 60),
  ADD COLUMN IF NOT EXISTS skills TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_states TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_categories TEXT[] NOT NULL DEFAULT '{}';