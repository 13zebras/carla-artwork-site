alter table site_settings
  drop column if exists animation_grayscale,
  drop column if exists animation_type;
