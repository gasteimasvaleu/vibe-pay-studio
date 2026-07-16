ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS x_handle text;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_x_handle_length CHECK (x_handle IS NULL OR char_length(x_handle) <= 30);