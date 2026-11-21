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
create policy "Anyone can read photo requests" on public.host_photo_requests
for select to anon, authenticated using (true);

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