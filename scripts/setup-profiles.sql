-- Run this SQL in your Supabase SQL editor to create the profiles table
-- This enables user search by username and family member linking

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create family relationships table
CREATE TABLE IF NOT EXISTS public.family_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  family_member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'family',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, family_member_id)
);

-- 3. Create locations table (shared locations)
CREATE TABLE IF NOT EXISTS public.shared_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  shared_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '1 hour')
);

-- 4. Create alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT,
  alert_type TEXT DEFAULT 'emergency',
  created_at TIMESTAMPTZ DEFAULT now(),
  acknowledged BOOLEAN DEFAULT false
);

-- 5. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Profiles: users can read all profiles (for search), update their own
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Family: users can manage their own relationships
DROP POLICY IF EXISTS "family_select" ON public.family_relationships;
DROP POLICY IF EXISTS "family_insert" ON public.family_relationships;
DROP POLICY IF EXISTS "family_delete" ON public.family_relationships;
CREATE POLICY "family_select" ON public.family_relationships FOR SELECT USING (user_id = auth.uid() OR family_member_id = auth.uid());
CREATE POLICY "family_insert" ON public.family_relationships FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "family_delete" ON public.family_relationships FOR DELETE USING (user_id = auth.uid());

-- Locations: family members can see shared locations
DROP POLICY IF EXISTS "locations_select" ON public.shared_locations;
DROP POLICY IF EXISTS "locations_insert" ON public.shared_locations;
CREATE POLICY "locations_select" ON public.shared_locations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.family_relationships WHERE (user_id = auth.uid() AND family_member_id = shared_locations.user_id))
  OR user_id = auth.uid()
);
CREATE POLICY "locations_insert" ON public.shared_locations FOR INSERT WITH CHECK (user_id = auth.uid());

-- Alerts: recipients can read their alerts
DROP POLICY IF EXISTS "alerts_select" ON public.alerts;
DROP POLICY IF EXISTS "alerts_insert" ON public.alerts;
DROP POLICY IF EXISTS "alerts_update" ON public.alerts;
CREATE POLICY "alerts_select" ON public.alerts FOR SELECT USING (recipient_id = auth.uid() OR sender_id = auth.uid());
CREATE POLICY "alerts_insert" ON public.alerts FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "alerts_update" ON public.alerts FOR UPDATE USING (recipient_id = auth.uid());

-- 7. Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger the function on auth user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
