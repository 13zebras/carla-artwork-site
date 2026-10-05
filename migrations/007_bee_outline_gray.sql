-- Add the outline gray setting and bring saved sizes into the new 24-48px range.
update site_settings
set bee_settings = bee_settings || jsonb_build_object(
  'outlineGray', 0.6,
  'size', least(48, greatest(24, (bee_settings->>'size')::integer))
);

alter table site_settings
  alter column bee_settings set default '{
    "minSpeed": 30,
    "maxSpeed": 80,
    "size": 32,
    "trailLifetime": 90,
    "loopSize": 0.15,
    "travelIntensity": 0.9,
    "loopSpacing": 0.6,
    "trailOpacity": 0.9,
    "maxQuadrantSeconds": 7,
    "loopVariation": 0.4,
    "trailWidth": 2,
    "outlineGray": 0.6
  }'::jsonb;
