alter table site_settings
  alter column updated_at type timestamptz using updated_at::timestamptz,
  alter column updated_at set default current_timestamp;

alter table artwork_categories
  alter column created_at type timestamptz using created_at::timestamptz,
  alter column created_at set default current_timestamp,
  alter column updated_at type timestamptz using updated_at::timestamptz,
  alter column updated_at set default current_timestamp;

alter table artworks
  alter column created_at type timestamptz using created_at::timestamptz,
  alter column created_at set default current_timestamp,
  alter column updated_at type timestamptz using updated_at::timestamptz,
  alter column updated_at set default current_timestamp;
