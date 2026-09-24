alter table site_settings
  add column bee_settings jsonb not null default '{
    "minSpeed": 30,
    "maxSpeed": 80,
    "size": 20,
    "trailLifetime": 90,
    "loopSize": 0.15,
    "travelIntensity": 0.9,
    "loopSpacing": 0.6,
    "trailOpacity": 0.9,
    "maxQuadrantSeconds": 7,
    "loopVariation": 0.4,
    "trailWidth": 2
  }'::jsonb,
  add column bee_revision integer not null default 0 check (bee_revision >= 0);
