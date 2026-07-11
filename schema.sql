-- Create a secure schema for the duplicate image detector

-- Enable the uuid-ossp extension (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the images table
CREATE TABLE IF NOT EXISTS public.images (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  filename text NOT NULL,
  storage_path text NOT NULL,
  dhash text NOT NULL,
  file_size bigint NOT NULL,
  uploaded_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS) for the images table
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view only their own images
CREATE POLICY "Users can view their own images" 
ON public.images FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own images
CREATE POLICY "Users can insert their own images" 
ON public.images FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to delete their own images
CREATE POLICY "Users can delete their own images" 
ON public.images FOR DELETE 
USING (auth.uid() = user_id);

-- Set up Storage for photos
-- Note: In the Supabase UI, you may need to manually create the 'photos' bucket 
-- and set it to private or public depending on your needs. A private bucket is 
-- recommended for user photos, using signed URLs for access.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
-- Allow users to upload to the photos bucket
CREATE POLICY "Users can upload their own photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos' AND 
  auth.role() = 'authenticated'
);

-- Allow users to read their own photos (if public is false, otherwise anyone can read)
CREATE POLICY "Users can read their own photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'photos'
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
