-- REDBOX LIVE ATTENDANCE
-- Jalankan seluruh SQL ini di Supabase > SQL Editor.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.hosts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.hosts add column if not exists avatar_url text;

insert into public.hosts (name)
values ('Aulia'), ('Eka')
on conflict (name) do nothing;

create table if not exists public.host_photo_requests (
  id uuid primary key default gen_random_uuid(),
  host_name text not null,
  photo_data_url text not null,
  requested_by text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists host_photo_requests_status_idx
  on public.host_photo_requests(status, created_at desc);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  attendance_date date not null,
  host text not null,
  status text not null check (status in ('holiday','sick','four_hours','full')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(attendance_date, host)
);

-- Jika upgrading dari schema lama yang memakai CHECK (host in ('Aulia','Eka')), hapus constraint lama:
alter table public.attendance drop constraint if exists attendance_host_check;

create index if not exists attendance_date_idx on public.attendance(attendance_date desc);
create index if not exists attendance_host_idx on public.attendance(host);

alter table public.admin_users enable row level security;
alter table public.hosts enable row level security;
alter table public.host_photo_requests enable row level security;
alter table public.attendance enable row level security;

drop policy if exists "Admin can read own allowlist" on public.admin_users;
create policy "Admin can read own allowlist" on public.admin_users
for select to authenticated using (user_id = auth.uid());

drop policy if exists "Public can read hosts" on public.hosts;
create policy "Public can read hosts" on public.hosts
for select to anon, authenticated using (true);

drop policy if exists "Allowlisted admin manages hosts" on public.hosts;
create policy "Allowlisted admin manages hosts" on public.hosts
for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "Anyone can read photo requests" on public.host_photo_requests;
drop policy if exists "Allowlisted admins read photo requests" on public.host_photo_requests;
create policy "Allowlisted admins read photo requests" on public.host_photo_requests
for select to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "Anyone can submit pending photo request" on public.host_photo_requests;
create policy "Anyone can submit pending photo request" on public.host_photo_requests
for insert to anon, authenticated
with check (status = 'pending');

drop policy if exists "Allowlisted admin reviews photo requests" on public.host_photo_requests;
create policy "Allowlisted admin reviews photo requests" on public.host_photo_requests
for update to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "Allowlisted admin deletes photo requests" on public.host_photo_requests;
create policy "Allowlisted admin deletes photo requests" on public.host_photo_requests
for delete to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "Public can read attendance" on public.attendance;
create policy "Public can read attendance" on public.attendance
for select to anon, authenticated using (true);

drop policy if exists "Allowlisted admin manages attendance" on public.attendance;
create policy "Allowlisted admin manages attendance" on public.attendance
for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- SETUP ADMIN:
-- 1. Buat satu user melalui Supabase > Authentication > Users > Add user.
-- 2. Salin UUID user tersebut.
-- 3. Jalankan: insert into public.admin_users(user_id) values ('UUID-ADMIN-DI-SINI');
-- Jangan pernah menaruh service_role key di frontend/Vercel public variables.

-- BACKGROUND MUSIC WEBSITE (semua halaman)
create table if not exists public.site_music (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default false,
  track_url text not null default '',
  title text not null default 'REDBOX Background Music',
  volume integer not null default 35 check (volume between 0 and 100),
  tracks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_music
  add column if not exists tracks jsonb not null default '[]'::jsonb;

insert into public.site_music (id) values (1) on conflict (id) do nothing;
alter table public.site_music enable row level security;

drop policy if exists "Public can read site music" on public.site_music;
create policy "Public can read site music" on public.site_music
for select to anon, authenticated using (true);

drop policy if exists "Allowlisted admin manages site music" on public.site_music;
create policy "Allowlisted admin manages site music" on public.site_music
for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));


-- Public audio bucket. Upload/delete are restricted to allowlisted admins.
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
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);

drop policy if exists "Allowlisted admins delete REDBOX music" on storage.objects;
create policy "Allowlisted admins delete REDBOX music"
on storage.objects for delete to authenticated
using (
  bucket_id = 'site-music'
  and exists (select 1 from public.admin_users a where a.user_id = auth.uid())
);
