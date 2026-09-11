CREATE TABLE public.recipient_contact_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_verification_id uuid NOT NULL REFERENCES public.recipient_verifications(id) ON DELETE CASCADE,
  donor_id uuid NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.recipient_contact_logs TO service_role;
ALTER TABLE public.recipient_contact_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX recipient_contact_logs_recipient_idx ON public.recipient_contact_logs (recipient_verification_id, created_at DESC);