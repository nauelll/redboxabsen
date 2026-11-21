-- REDBOX site-wide music playlist migration.
-- Safe additive migration: does not update, delete, or truncate attendance data.

create table if not exists public.site_music (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default false,
  track_url text not null default '',
  title text not null default 'REDBOX Background Music',
  volume integer not null default 35 check (volume between 0 and 100),
  updated_at timestamptz not null default now()
);

alter table public.site_music
  add column if not exists tracks jsonb not null default '[]'::jsonb;

insert into public.site_music (id)
values (1)
on conflict (id) do nothing;

alter table public.site_music enable row level security;

drop policy if exists "Anyone can read photo requests" on public.host_photo_requests;
drop policy if exists "Allowlisted admins read photo requests" on public.host_photo_requests;
create policy "Allowlisted admins read photo requests" on public.host_photo_requests
for select to authenticated
using (
  exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  )
);

drop policy if exists "Public can read site music" on public.site_music;
create policy "Public can read site music" on public.site_music
for select to anon, authenticated
using (true);

drop policy if exists "Allowlisted admin manages site music" on public.site_music;
create policy "Allowlisted admin manages site music" on public.site_music
for all to authenticated
using (
  exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-music',
  'site-music',
  true,
  20971520,
  array['audio/mpeg','audio/mp3','audio/ogg','audio/wav','audio/x-wav','audio/aac','audio/mp4','audio/webm']
)
on conflict (id) do update
set public = true,
    file_size_limit = 20971520,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read REDBOX music files" on storage.objects;
create policy "Public can read REDBOX music files"
on storage.objects for select to anon, authenticated
using (bucket_id = 'site-music');

drop policy if exists "Allowlisted admins upload REDBOX music" on storage.objects;
create policy "Allowlisted admins upload REDBOX music"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'site-music'
  and exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  )
);

drop policy if exists "Allowlisted admins delete REDBOX music" on storage.objects;
create policy "Allowlisted admins delete REDBOX music"
on storage.objects for delete to authenticated
using (
  bucket_id = 'site-music'
  and exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  )
);
