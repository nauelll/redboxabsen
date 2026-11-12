-- REDBOX LIVE ATTENDANCE
-- Jalankan seluruh SQL ini di Supabase > SQL Editor.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  attendance_date date not null,
  host text not null check (host in ('Aulia','Eka')),
  status text not null check (status in ('holiday','sick','four_hours','full')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(attendance_date, host)
);

create index if not exists attendance_date_idx on public.attendance(attendance_date desc);
create index if not exists attendance_host_idx on public.attendance(host);

alter table public.admin_users enable row level security;
alter table public.attendance enable row level security;

drop policy if exists "Admin can read own allowlist" on public.admin_users;
create policy "Admin can read own allowlist" on public.admin_users
for select to authenticated using (user_id = auth.uid());

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