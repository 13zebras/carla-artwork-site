create table if not exists "user" (
  id text primary key,
  name text not null,
  email text not null unique,
  "emailVerified" boolean not null default false,
  image text,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null default current_timestamp
);

create table if not exists "session" (
  id text primary key,
  "expiresAt" timestamptz not null,
  token text not null unique,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null default current_timestamp,
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user"(id) on delete cascade
);

create table if not exists account (
  id text primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user"(id) on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null default current_timestamp
);

create table if not exists verification (
  id text primary key,
  identifier text not null,
  value text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null default current_timestamp
);

create index if not exists "session_userId_idx" on "session"("userId");
create index if not exists "account_userId_idx" on account("userId");
create index if not exists "verification_identifier_idx" on verification(identifier);

create table if not exists site_settings (
  id text primary key check (id = 'site'),
  demo_mode boolean not null default false,
  about_text text not null default '',
  about_mobile_image_path text,
  about_desktop_image_path text,
  about_image_alt text not null default '',
  updated_at text not null
);

alter table site_settings add column if not exists about_text text not null default '';
alter table site_settings add column if not exists about_mobile_image_path text;
alter table site_settings add column if not exists about_desktop_image_path text;
alter table site_settings add column if not exists about_image_alt text not null default '';

insert into site_settings (id, demo_mode, updated_at)
values ('site', false, current_timestamp::text)
on conflict (id) do nothing;

create sequence if not exists artwork_category_id_seq;

create table if not exists artwork_categories (
  id text primary key,
  category_slug text,
  label text not null,
  description text,
  sort_order integer not null default 0,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at text not null,
  updated_at text not null
);

alter table artwork_categories add column if not exists category_slug text;
update artwork_categories set category_slug = id where category_slug is null or category_slug = '';
alter table artwork_categories drop column if exists slug;

create table if not exists artworks (
  id text primary key,
  slug text not null unique,
  title text not null,
  category_id text not null references artwork_categories(id),
  description text,
  alt text not null,
  original_filename text not null,
  storage_path text not null unique,
  cdn_url text not null,
  content_type text not null,
  width integer not null,
  height integer not null,
  size_bytes integer not null,
  checksum_sha256 text not null,
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at text not null,
  updated_at text not null
);

-- Convert legacy category slugs to immutable cNNN ids once, before recording this migration.
do $$
declare
  fk_name text;
begin
  if exists (select 1 from artwork_categories where id !~ '^c[0-9]+$') then
    select conname into fk_name
    from pg_constraint
    where conrelid = 'artworks'::regclass
      and confrelid = 'artwork_categories'::regclass
      and contype = 'f'
    limit 1;

    if fk_name is not null then
      execute format('alter table artworks drop constraint %I', fk_name);
    end if;
  end if;
end $$;

create temporary table category_id_migration (
  old_id text primary key,
  new_id text not null
) on commit drop;

with max_existing as (
  select coalesce(max((substring(id from 2))::integer), 0) as max_id
  from artwork_categories
  where id ~ '^c[0-9]+$'
), legacy as (
  select id as old_id, row_number() over (order by sort_order, label, id) as rn
  from artwork_categories
  where id !~ '^c[0-9]+$'
)
insert into category_id_migration (old_id, new_id)
select legacy.old_id, 'c' || lpad((max_existing.max_id + legacy.rn)::text, 3, '0')
from legacy cross join max_existing;

update artworks
set category_id = category_id_migration.new_id
from category_id_migration
where artworks.category_id = category_id_migration.old_id;

update artwork_categories
set id = category_id_migration.new_id
from category_id_migration
where artwork_categories.id = category_id_migration.old_id;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'artworks'::regclass
      and confrelid = 'artwork_categories'::regclass
      and contype = 'f'
  ) then
    alter table artworks
      add constraint artworks_category_id_fkey
      foreign key (category_id) references artwork_categories(id);
  end if;
end $$;

alter table artwork_categories alter column category_slug set not null;

select setval(
  'artwork_category_id_seq',
  greatest(coalesce(max((substring(id from 2))::integer), 0), 1),
  coalesce(max((substring(id from 2))::integer), 0) > 0
)
from artwork_categories
where id ~ '^c[0-9]+$';

create unique index if not exists "artwork_categories_category_slug_idx"
  on artwork_categories(category_slug);
create index if not exists "artwork_categories_status_sort_idx"
  on artwork_categories(status, sort_order, label);
create index if not exists "artworks_category_idx" on artworks(category_id);
create index if not exists "artworks_status_sort_idx"
  on artworks(status, sort_order, created_at);
