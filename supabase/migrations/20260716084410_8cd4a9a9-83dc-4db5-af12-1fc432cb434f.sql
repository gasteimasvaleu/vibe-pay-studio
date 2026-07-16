ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_location_length CHECK (location IS NULL OR char_length(location) <= 120);