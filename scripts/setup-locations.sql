-- Run this SQL in your Supabase SQL editor to enable database location tracking.
-- Required for: Family Emergency Locator live sharing + "Share My Location".
-- This is a subset of scripts/setup-profiles.sql scoped to location tracking.

-- 1. Family relationships (links users to their family members by profile id)
CREATE TABLE IF NOT EXISTS public.family_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  family_member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'family',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, family_member_id)
);

-- 2. Shared locations (one row per user, expires after 1 hour)
CREATE TABLE IF NOT EXISTS public.shared_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  shared_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '1 hour')
);

-- 3. Enable Row Level Security
ALTER TABLE public.family_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_locations ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Family: users can read relationships they are part of, manage their own
DROP POLICY IF EXISTS "family_select" ON public.family_relationships;
DROP POLICY IF EXISTS "family_insert" ON public.family_relationships;
DROP POLICY IF EXISTS "family_delete" ON public.family_relationships;
CREATE POLICY "family_select" ON public.family_relationships FOR SELECT USING (user_id = auth.uid() OR family_member_id = auth.uid());
CREATE POLICY "family_insert" ON public.family_relationships FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "family_delete" ON public.family_relationships FOR DELETE USING (user_id = auth.uid());

-- Locations: a user can read their own location and the locations shared by
-- family members they added; only the owner can insert their own location.
DROP POLICY IF EXISTS "locations_select" ON public.shared_locations;
DROP POLICY IF EXISTS "locations_insert" ON public.shared_locations;
DROP POLICY IF EXISTS "locations_delete" ON public.shared_locations;
CREATE POLICY "locations_select" ON public.shared_locations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_relationships WHERE (user_id = auth.uid() AND family_member_id = shared_locations.user_id))
  OR user_id = auth.uid()
);
CREATE POLICY "locations_insert" ON public.shared_locations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "locations_delete" ON public.shared_locations FOR DELETE USING (user_id = auth.uid());

-- 5. Helpful queries for verification (optional)

-- View your shared location
-- SELECT * FROM public.shared_locations WHERE user_id = auth.uid() ORDER BY shared_at DESC;

-- View locations shared by your family members
-- SELECT sl.*, p.username, p.display_name
-- FROM public.shared_locations sl
-- JOIN public.profiles p ON p.id = sl.user_id
-- WHERE EXISTS (
--   SELECT 1 FROM public.family_relationships fr
--   WHERE fr.user_id = auth.uid() AND fr.family_member_id = sl.user_id
-- )
-- ORDER BY sl.shared_at DESC;
