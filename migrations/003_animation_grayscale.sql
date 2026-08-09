alter table site_settings
  add column if not exists animation_grayscale boolean not null default false;
