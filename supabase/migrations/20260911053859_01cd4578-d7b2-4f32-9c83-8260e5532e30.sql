ALTER TABLE public.recipient_verifications DROP COLUMN aadhaar_last4;
ALTER TABLE public.recipient_verifications DROP COLUMN aadhaar_hash;
ALTER TABLE public.recipient_verifications ADD COLUMN face_image_path text;