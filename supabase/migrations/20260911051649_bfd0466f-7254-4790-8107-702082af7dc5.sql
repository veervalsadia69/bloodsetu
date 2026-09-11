CREATE TABLE public.donors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  blood_type text NOT NULL,
  last_donation_date date,
  medical_conditions text,
  age integer NOT NULL,
  gender text NOT NULL,
  city text NOT NULL,
  neighborhood text NOT NULL,
  contact_number text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX donors_blood_type_idx ON public.donors (blood_type);
CREATE INDEX donors_city_idx ON public.donors (lower(city));

GRANT ALL ON public.donors TO service_role;
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.recipient_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  mobile text NOT NULL,
  aadhaar_last4 text NOT NULL,
  aadhaar_hash text NOT NULL,
  otp_hash text NOT NULL,
  otp_expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  verified boolean NOT NULL DEFAULT false,
  access_token text,
  token_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX recipient_verifications_token_idx ON public.recipient_verifications (access_token) WHERE access_token IS NOT NULL;

GRANT ALL ON public.recipient_verifications TO service_role;
ALTER TABLE public.recipient_verifications ENABLE ROW LEVEL SECURITY;

INSERT INTO public.donors (full_name, blood_type, last_donation_date, medical_conditions, age, gender, city, neighborhood, contact_number) VALUES
('Aarav Sharma', 'O+', '2025-11-02', 'None', 28, 'Male', 'Mumbai', 'Andheri West', '9820011223'),
('Priya Nair', 'A+', NULL, 'Mild BP, controlled', 34, 'Female', 'Mumbai', 'Bandra', '9820044556'),
('Rohit Deshmukh', 'B+', '2026-08-20', 'None', 31, 'Male', 'Mumbai', 'Dadar', '9820077889'),
('Sneha Iyer', 'O-', '2026-01-14', 'None', 26, 'Female', 'Mumbai', 'Andheri East', '9820099001'),
('Imran Qureshi', 'AB+', NULL, 'Diabetes type 2', 45, 'Male', 'Delhi', 'Karol Bagh', '9811022334'),
('Kavya Reddy', 'A-', '2026-02-10', 'None', 23, 'Female', 'Hyderabad', 'Gachibowli', '9701033445'),
('Manish Gupta', 'B-', '2025-12-05', 'None', 38, 'Male', 'Delhi', 'Saket', '9811055667'),
('Ananya Bose', 'O+', NULL, 'None', 29, 'Female', 'Kolkata', 'Salt Lake', '9830066778'),
('Vikram Singh', 'AB-', '2026-06-30', 'None', 41, 'Male', 'Bengaluru', 'Indiranagar', '9880077889'),
('Divya Menon', 'A+', '2025-10-18', 'Asthma', 27, 'Female', 'Bengaluru', 'Koramangala', '9880011224'),
('Sandeep Patel', 'O+', NULL, 'None', 36, 'Male', 'Ahmedabad', 'Navrangpura', '9825044556'),
('Meera Joshi', 'B+', '2026-03-22', 'None', 32, 'Female', 'Pune', 'Kothrud', '9822077880');