CREATE TABLE public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name text NOT NULL,
  city text NOT NULL,
  contact_number text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitals TO authenticated;
GRANT SELECT ON public.hospitals TO anon;
GRANT ALL ON public.hospitals TO service_role;

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view hospitals" ON public.hospitals FOR SELECT USING (true);
CREATE POLICY "Hospitals manage own profile" ON public.hospitals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.blood_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  blood_type text NOT NULL,
  units integer NOT NULL DEFAULT 0 CHECK (units >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, blood_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_stock TO authenticated;
GRANT SELECT ON public.blood_stock TO anon;
GRANT ALL ON public.blood_stock TO service_role;

ALTER TABLE public.blood_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blood stock" ON public.blood_stock FOR SELECT USING (true);
CREATE POLICY "Hospitals manage own stock" ON public.blood_stock FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = hospital_id AND h.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.hospitals h WHERE h.id = hospital_id AND h.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_hospitals_updated_at BEFORE UPDATE ON public.hospitals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blood_stock_updated_at BEFORE UPDATE ON public.blood_stock FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();