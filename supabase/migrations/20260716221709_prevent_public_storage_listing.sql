-- Both buckets are public, so direct object URLs remain readable without a
-- SELECT policy. Removing these broad policies prevents clients from listing
-- every stored object and exposing filenames or folder structure.
DROP POLICY IF EXISTS "message_attachments_read" ON storage.objects;
DROP POLICY IF EXISTS "shelf_resources_read" ON storage.objects;
