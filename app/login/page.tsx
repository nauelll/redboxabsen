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
    </section>
    <div className="login-orb orb-one"/><div className="login-orb orb-two"/>
  </main>;
}