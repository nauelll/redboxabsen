# REDBOX LIVE ATTENDANCE

Aplikasi absensi host live REDBOX untuk satu admin dan dua host (Aulia, Eka).

## Fitur
- Login admin melalui Supabase Auth.
- Input absensi tanggal bebas.
- Satu status per host per tanggal; input ulang tanggal yang sama memperbarui data.
- Status: Libur (merah), Sakit (biru), 4 Jam (kuning), Full (hijau).
- Catatan opsional.
- Filter host, status, bulan, dan pencarian.
- Pembaruan data otomatis melalui Supabase Realtime saat ada perubahan data.
- Export PDF A4 landscape: Aulia, Eka, atau gabungan.
- RLS Supabase membatasi pengelolaan data ke user yang masuk allowlist admin.

## 1. Siapkan Supabase
1. Buat project baru di https://supabase.com.
2. Buka SQL Editor dan jalankan seluruh isi `supabase/schema.sql`.
3. Buka Authentication > Users > Add user, buat akun admin.
4. Salin UUID user admin.
5. Jalankan SQL `insert into public.admin_users(user_id) values ('UUID-ADMIN-DI-SINI');`.
6. Buka Project Settings > API, salin Project URL dan anon/public key.

## 2. Jalankan di komputer
Butuh Node.js 20 atau lebih baru.
```bash
npm install
```
Salin `.env.example` menjadi `.env.local`, lalu isi:
```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ANON_PUBLIC_KEY
```
Lalu:
```bash
npm run dev
```
Buka http://localhost:3000.

## 3. GitHub
Buat repository baru bernama `redbox-live-attendance`, lalu dari folder project:
```bash
git init
git add .
git commit -m "Initial REDBOX attendance app"
git branch -M main
git remote add origin https://github.com/USERNAME/redbox-live-attendance.git
git push -u origin main
```

## 4. Vercel
1. Login ke https://vercel.com dan pilih Add New > Project.
2. Import repository GitHub.
3. Tambahkan environment variables `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy.
5. Di Supabase Authentication > URL Configuration, tambahkan domain Vercel ke Site URL dan Redirect URLs.

## Catatan penting
- Jangan pernah mengirim password admin atau Supabase service_role key ke GitHub.
- PDF gabungan dapat menambah halaman otomatis jika tabel Aulia dan Eka tidak muat di satu halaman.
- Statistik dashboard dihitung dari catatan pada bulan terpilih.
- Untuk penggunaan produksi, uji login, kebijakan RLS, input ganda, dan hasil PDF sebelum dipakai operasional.
