<<<<<<< HEAD
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  HeartPulse,
  Loader2,
  LockKeyhole,
  LogOut,
  Palmtree,
  ShieldCheck,
} from "lucide-react";
import LaunchSplash from "@/components/LaunchSplash";

const SHIFT_PREVIEWS = [
  {
    key: "full",
    label: "Shift Full",
    detail: "Durasi operasional penuh · Target harian tercapai",
    icon: CheckCircle2,
    tone: "green",
  },
  {
    key: "four_hours",
    label: "Shift 4 Jam",
    detail: "Sesi paruh waktu · Tercatat otomatis di laporan",
    icon: Clock3,
    tone: "yellow",
  },
  {
    key: "holiday",
    label: "Libur Terjadwal",
    detail: "Hari istirahat resmi host live REDBOX",
    icon: Palmtree,
    tone: "red",
  },
  {
    key: "sick",
    label: "Izin Sakit",
    detail: "Ketidakhadiran dengan catatan keterangan",
    icon: HeartPulse,
    tone: "blue",
  },
] as const;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activePreview, setActivePreview] = useState<string>("full");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [existingUser, setExistingUser] = useState<{
    email: string;
    isAdmin: boolean;
  } | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function checkCurrentSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active || !user) return;

      const { data: adminRow } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (active) {
        setExistingUser({
          email: user.email || "Akun aktif",
          isAdmin: !!adminRow,
        });
      }
    }

    checkCurrentSession();
    return () => {
      active = false;
    };
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError || !data.user) {
        setBusy(false);
        setError("Email atau password tidak cocok. Periksa kembali kredensial Anda.");
        return;
      }

      const { data: adminRow, error: adminErr } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (adminErr) {
        setBusy(false);
        setError(`Gagal memeriksa hak admin: ${adminErr.message}`);
        return;
      }

      if (!adminRow) {
        setBusy(false);
        setError(
          `Login berhasil (${data.user.email}), tetapi akun ini belum terdaftar di tabel admin_users (UID: ${data.user.id}).`
        );
        return;
      }

      router.refresh();
      router.push("/dashboard");
    } catch (err) {
      setBusy(false);
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat masuk."
      );
    }
  }

  async function handleSignOutExisting() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setExistingUser(null);
    setError("");
  }

  return (
    <main className="entry-shell">
      <LaunchSplash subtitle="Menyiapkan Menu Masuk Utama" durationMs={600} />

      <div className="entry-grid">
        {/* Left Editorial Showcase Panel */}
        <motion.section
          className="entry-showcase"
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="entry-showcase-bg" />
          <div className="entry-showcase-inner">
            <div className="entry-brand">
              {logoFailed ? (
                <div className="entry-logo-fallback">RB</div>
              ) : (
                <img
                  className="entry-logo"
                  src="/redbox-logo.png"
                  alt="Logo REDBOX"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoFailed(true)}
                />
              )}
              <div>
                <strong>REDBOX</strong>
                <span>Live Attendance Studio</span>
              </div>
            </div>

            <div className="entry-hero">
              <p className="entry-kicker">Operasional Host · Live Studio</p>
              <h1>
                Kontrol kehadiran{" "}
                <br />
                dengan <em>presisi studio.</em>
              </h1>
              <p className="entry-lead">
                Pantau jadwal siaran, status shift harian, pengajuan foto profil
                host, dan ekspor laporan bulanan A4 dalam satu ruang kerja terintegrasi.
              </p>
            </div>

            <div
              className="entry-preview-list"
              role="tablist"
              aria-label="Pratinjau status shift"
            >
              {SHIFT_PREVIEWS.map((item) => {
                const Icon = item.icon;
                const selected = activePreview === item.key;
                return (
                  <motion.button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActivePreview(item.key)}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.99 }}
                    className={`entry-preview-item ${selected ? "active" : ""}`}
                  >
                    <span className={`entry-preview-icon ${item.tone}`}>
                      <Icon size={16} />
                    </span>
                    <span className="entry-preview-copy">
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <div className="entry-showcase-foot">
              <button
                type="button"
                className="entry-public-link"
                onClick={() => router.push("/dashboard")}
              >
                <span>Buka Dashboard Publik</span>
                <ArrowUpRight size={16} />
              </button>
              <span className="entry-foot-meta">
                Laporan A4 Landscape · Sinkronisasi Realtime
              </span>
            </div>
          </div>
        </motion.section>

        {/* Right Authentication Form Panel */}
        <motion.section
          className="entry-auth-pane"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="entry-auth-card">
            <div className="entry-auth-header">
              <span className="entry-kicker-dark">
                <ShieldCheck size={14} /> Portal Administrator
              </span>
              <h2>Selamat datang kembali</h2>
              <p className="muted">
                Masuk untuk mengelola catatan absensi, menyetujui foto profil host,
                dan mengunduh rekap resmi.
              </p>
            </div>

            {existingUser && (
              <div className="session-banner">
                <div>
                  <strong>
                    {existingUser.isAdmin
                      ? "Sesi Admin Aktif"
                      : "Akun Masuk Tanpa Hak Admin"}
                  </strong>
                  <small>{existingUser.email}</small>
                </div>
                <div className="session-banner-actions">
                  {existingUser.isAdmin && (
                    <button
                      type="button"
                      className="session-go-btn"
                      onClick={() => router.push("/dashboard")}
                    >
                      Dashboard
                    </button>
                  )}
                  <button
                    type="button"
                    className="session-out-btn"
                    onClick={handleSignOutExisting}
                  >
                    <LogOut size={13} />
                    <span>Ganti Akun</span>
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={login} className="entry-form">
              <label className="entry-field">
                <span>Email admin</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@redbox.id"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="entry-field">
                <span>Password</span>
                <div className="password-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password admin"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? "Sembunyikan password" : "Lihat password"
                    }
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.p
                    key="login-error"
                    className="entry-error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                className="primary-btn entry-submit"
                disabled={busy}
                whileHover={busy ? undefined : { y: -1 }}
                whileTap={busy ? undefined : { scale: 0.99 }}
              >
                {busy ? (
                  <>
                    <Loader2 size={17} className="spin-icon" />
                    <span>Memverifikasi akses...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Dashboard</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </motion.button>
            </form>

            <div className="entry-secondary-actions">
              <button
                type="button"
                className="ghost-nav-btn"
                onClick={() => router.push("/dashboard")}
              >
                <span>Masuk tanpa login (Mode Lihat &amp; Ajukan Foto)</span>
                <ArrowUpRight size={15} />
              </button>
            </div>

            <div className="entry-auth-foot">
              <div className="entry-lock-note">
                <LockKeyhole size={14} />
                <span>Area khusus administrator REDBOX Live Attendance</span>
              </div>
              <div className="nauell-copyright">
                © {new Date().getFullYear()} <strong>Nauell Tech.</strong> All rights
                reserved.
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
=======
 "use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LockKeyhole, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const router = useRouter();
  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setError("Email atau password tidak cocok.");
    else router.push("/dashboard");
  }
  return <main className="login-shell">
    <section className="login-card">
      <img className="redbox-logo" src="/redbox-logo.png" alt="Logo REDBOX"/>
      <div className="eyebrow">LIVE OPERATIONS · ATTENDANCE</div>
      <h1>Selamat datang<br/><em>kembali.</em></h1>
      <p className="muted">Masuk ke ruang kontrol absensi host REDBOX.</p>
      <form onSubmit={login} className="login-form">
        <label>Email admin<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@redbox..." required /></label>
        <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Masukkan password" required /></label>
        {error && <p className="error">{error}</p>}
        <button className="primary-btn" disabled={busy}>{busy ? "Memproses..." : "Masuk ke dashboard"} <ArrowRight size={17}/></button>
      </form>
      <div className="login-foot"><LockKeyhole size={14}/> Area khusus admin REDBOX</div>
      <div className="login-copyright">© {new Date().getFullYear()} <b>Nauell Tech.</b> All rights reserved.</div>
    </section>
    <div className="login-orb orb-one"/><div className="login-orb orb-two"/>
  </main>;
>>>>>>> 335cafa28b6e8524310779a6d02437148a1f79ca
}