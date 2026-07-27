CREATE TABLE public.trophy_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  creator_profile_id uuid,
  milestone_cents bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, creator_profile_id, milestone_cents)
);

GRANT SELECT, INSERT ON public.trophy_requests TO authenticated;
GRANT ALL ON public.trophy_requests TO service_role;

ALTER TABLE public.trophy_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select" ON public.trophy_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "own_insert" ON public.trophy_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_update" ON public.trophy_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trophy_requests_touch
  BEFORE UPDATE ON public.trophy_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();