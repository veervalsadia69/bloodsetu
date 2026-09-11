CREATE TABLE public.call_bridge_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_mobile TEXT NOT NULL,
  donor_id UUID NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '15 minutes',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.call_bridge_sessions TO service_role;
ALTER TABLE public.call_bridge_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX call_bridge_sessions_lookup ON public.call_bridge_sessions (recipient_mobile, created_at DESC);