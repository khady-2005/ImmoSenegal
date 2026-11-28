ALTER TABLE annonce_photos
    DROP CONSTRAINT IF EXISTS annonce_photos_type_mime_check;

ALTER TABLE annonce_photos
    ADD CONSTRAINT annonce_photos_type_mime_check
    CHECK (type_mime IN ('image/jpeg', 'image/png', 'image/webp'));
