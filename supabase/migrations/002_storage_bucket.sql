-- Storage bucket for reference images
-- Run this in the Supabase SQL Editor after creating the bucket in the dashboard

-- First, create the bucket via Supabase Dashboard:
-- Go to Storage > New Bucket > Name: "reference-images" > Public bucket: ON

-- Then run these policies:

-- Allow authenticated users to upload to reference-images bucket
create policy "Authenticated users can upload reference images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'reference-images');

-- Allow anyone to view reference images (public bucket)
create policy "Anyone can view reference images"
  on storage.objects for select
  to public
  using (bucket_id = 'reference-images');

-- Allow users to update their own uploads
create policy "Users can update own reference images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'reference-images');

-- Allow users to delete reference images
create policy "Authenticated users can delete reference images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'reference-images');
