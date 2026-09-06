alter table site_settings
  add column if not exists animation_type text not null default 'random';
