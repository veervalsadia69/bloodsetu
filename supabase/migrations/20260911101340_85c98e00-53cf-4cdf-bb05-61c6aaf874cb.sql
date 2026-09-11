CREATE SEQUENCE IF NOT EXISTS public.donor_code_seq START 1001;

CREATE OR REPLACE FUNCTION public.next_donor_code()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT 'BS-' || lpad(nextval('public.donor_code_seq')::text, 6, '0')
$$;

ALTER TABLE public.donors
  ADD COLUMN IF NOT EXISTS donor_code text NOT NULL DEFAULT public.next_donor_code();

UPDATE public.donors SET donor_code = public.next_donor_code() WHERE donor_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS donors_donor_code_key ON public.donors (donor_code);