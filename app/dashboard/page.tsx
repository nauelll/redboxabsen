 "use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Attendance, Host, Status, STATUS_LABELS } from "@/lib/types";
import { CalendarDays, Download, LogOut, Plus, Search, Users, CheckCircle2, Clock3, Palmtree, HeartPulse, Sparkles, RefreshCw } from "lucide-react";
import { exportAttendancePdf } from "@/lib/pdf";

const HOSTS: Host[] = ["Aulia","Eka"];
const STATUSES: Status[] = ["full","four_hours","holiday","sick"];

export default function Dashboard() {
  const supabase = createClient();
  const router = useRouter();
  const [rows,setRows] = useState<Attendance[]>([]);
  const [loading,setLoading] = useState(true);
  const [isAdmin,setIsAdmin] = useState(false);
  const [host,setHost] = useState("Semua");
  const [status,setStatus] = useState("Semua");
  const [month,setMonth] = useState(new Date().toISOString().slice(0,7));
  const [search,setSearch] = useState("");
  const [date,setDate] = useState(new Date().toISOString().slice(0,10));
  const [selectedHost,setSelectedHost] = useState<Host>("Aulia");
  const [selectedStatus,setSelectedStatus] = useState<Status>("full");
  const [note,setNote] = useState("");
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState("");
  const [editingId,setEditingId] = useState<string | null>(null);

  function startEdit(r: Attendance) {
    setEditingId(r.id);
    setDate(r.attendance_date);
    setSelectedHost(r.host);
    setSelectedStatus(r.status);
    setNote(r.note || "");
    setMessage("Mode edit: " + r.host);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setNote("");
    setMessage("Edit dibatalkan.");
  }

  async function load() {
    setLoading(true);
    const start = `${month}-01`;
    const endDate = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0).getDate();
    const end = `${month}-${String(endDate).padStart(2,"0")}`;
    const { data, error } = await supabase.from("attendance").select("*").gte("attendance_date",start).lte("attendance_date",end).order("attendance_date",{ascending:false});
    if (error) setMessage(error.message);
    else setRows((data || []) as Attendance[]);
    setLoading(false);
  }
  useEffect(()=>{
    let active = true;

    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (active) setIsAdmin(!error && !!data);
    }

    checkAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdmin();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  },[]);
  useEffect(()=>{ load(); },[month]);
  useEffect(()=>{
    const channel = supabase.channel("redbox-attendance-live")
      .on("postgres_changes",{event:"*",schema:"public",table:"attendance"},()=>{ load(); })
      .subscribe();
    return ()=>{ supabase.removeChannel(channel); };
  },[month]);
  const filtered = useMemo(()=>rows.filter(r=>(host==="Semua" || r.host===host) && (status==="Semua" || r.status===status) && (!search || `${r.host} ${r.note||""} ${r.attendance_date}`.toLowerCase().includes(search.toLowerCase()))),[rows,host,status,search]);
  const counts = useMemo(()=> {
    const result: Record<Status,number> = {full:0,four_hours:0,holiday:0,sick:0};
    rows.forEach(r=>result[r.status]++);
    return result;
  },[rows]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const payload = {
      attendance_date: date,
      host: selectedHost,
      status: selectedStatus,
      note: note.trim() || null
    };

    const result = editingId
      ? await supabase.from("attendance").update(payload).eq("id", editingId)
      : await supabase.from("attendance").upsert(payload, { onConflict: "attendance_date,host" });

    setSaving(false);

    if (result.error) {
      setMessage(result.error.message);
    } else {
      setMessage(editingId ? "Perubahan absensi berhasil disimpan." : "Absensi berhasil disimpan.");
      setEditingId(null);
      setNote("");
      if (date.slice(0,7) === month) await load();
    }
  }
  async function logout() { await supabase.auth.signOut(); router.push("/login"); }
  const today = new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const [calendarYear, calendarMonth] = month.split("-").map(Number);
  const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
  const firstWeekday = new Date(calendarYear, calendarMonth - 1, 1).getDay();
  const calendarCells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];
  const monthLabel = new Date(calendarYear, calendarMonth - 1, 1)
    .toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const recentRows = rows.slice(0, 5);
  return <main className="dashboard-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><img className="side-logo" src="/redbox-logo.png" alt="Logo REDBOX"/><div><b>REDBOX</b><small>LIVE ATTENDANCE</small></div></div>
      <div className="side-caption">WORKSPACE</div>
      <div className="nav-active"><CalendarDays size={18}/> Dashboard</div>
      <div className="side-nav-item"><Users size={18}/> Data Host</div>
      <div className="side-nav-item"><Clock3 size={18}/> Riwayat Absensi</div>
      <div className="sidebar-spacer"/>
      <div className="sidebar-brand-note"><b>REDBOX</b><strong>Live Attendance</strong><small>Track. Manage. Grow.</small></div>
      <div className="sidebar-bottom">{isAdmin ? <><div className="admin-chip"><div className="admin-avatar">A</div><div><b>Administrator</b><small>REDBOX Control</small></div></div><button className="logout-btn" onClick={logout}><LogOut size={17}/> Keluar</button></> : <button className="logout-btn" onClick={()=>router.push("/login")}>Login Admin</button>}</div>
    </aside>
    <section className="main-content">
      <header className="topbar"><div><div className="eyebrow">REDBOX / OPERASIONAL</div><h1>Dashboard</h1><p className="muted">Selamat datang di REDBOX Live Attendance Host · {today}</p></div><div className="topbar-right"><div className="live-pill"><span/> LIVE DATABASE</div><div className="date-chip"><CalendarDays size={16}/>{monthLabel}</div></div></header>
      <section className="hero-panel"><div className="hero-copy"><div className="eyebrow light">HOST PERFORMANCE TRACKER</div><h2>Good work deserves<br/><em>to be seen.</em></h2><p>Kelola kehadiran Host Redbox.</p></div><div className="hero-stamp"><Sparkles size={23}/><span>REDBOX<br/>LIVE TEAM</span></div><div className="hero-glow"/></section>
      <section className="stat-grid">
        <Stat icon={<CheckCircle2/>} label="Full" value={counts.full} tone="green"/>
        <Stat icon={<Clock3/>} label="4 Jam" value={counts.four_hours} tone="yellow"/>
        <Stat icon={<Palmtree/>} label="Libur" value={counts.holiday} tone="red"/>
        <Stat icon={<HeartPulse/>} label="Sakit" value={counts.sick} tone="blue"/>
      </section>
      <div className="overview-grid">
        <section className="panel calendar-panel">
          <div className="panel-heading"><div><div className="eyebrow">MONTHLY OVERVIEW</div><h3>Kalender Absensi</h3></div><span className="panel-icon"><CalendarDays size={18}/></span></div>
          <div className="calendar-month"><b>{monthLabel}</b><span className="calendar-hint">Titik menunjukkan catatan absensi</span></div>
          <div className="calendar-grid">
            {["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map(day=><div className="calendar-weekday" key={day}>{day}</div>)}
            {calendarCells.map((day,index)=>{
              if (!day) return <div className="calendar-day blank" key={`blank-${index}`}/>;
              const dateKey = `${month}-${String(day).padStart(2,"0")}`;
              const dayRows = rows.filter(r=>r.attendance_date===dateKey);
              const isToday = new Date().toISOString().slice(0,10)===dateKey;
              return <div className={`calendar-day ${isToday?"today":""}`} key={dateKey}>
                <span>{day}</span>
                <div className="calendar-dots">{dayRows.map(r=><i key={r.id} className={`dot-${r.status}`} title={`${r.host}: ${STATUS_LABELS[r.status]}`}/>)}</div>
              </div>;
            })}
          </div>
          <div className="calendar-legend"><span><i className="dot-full"/> Full</span><span><i className="dot-four_hours"/> 4 Jam</span><span><i className="dot-holiday"/> Libur</span><span><i className="dot-sick"/> Sakit</span></div>
        </section>
        <section className="panel activity-panel">
          <div className="panel-heading"><div><div className="eyebrow">LIVE UPDATES</div><h3>Aktivitas Terbaru</h3></div><span className="panel-icon"><RefreshCw size={18}/></span></div>
          {recentRows.length===0 ? <div className="activity-empty">Belum ada aktivitas pada bulan ini.</div> : recentRows.map(r=><div className="activity-row" key={r.id}><div className={`host-avatar ${r.host.toLowerCase()}`}>{r.host[0]}</div><div className="host-info"><b>{r.host}</b><small>{new Date(`${r.attendance_date}T00:00:00`).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"})}</small></div><span className={`status-badge ${r.status}`}>{STATUS_LABELS[r.status]}</span></div>)}
        </section>
      </div>
      <div className="content-grid">
        {isAdmin && <section className="panel entry-panel"><div className="panel-heading"><div><div className="eyebrow">DAILY INPUT</div><h3>{editingId ? "Edit absensi" : "Tambah absensi"}</h3></div><span className="panel-icon"><Plus size={18}/></span></div>
          <form onSubmit={save} className="entry-form">
            <label>Tanggal<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label>
            <label>Nama host<select value={selectedHost} onChange={e=>setSelectedHost(e.target.value as Host)}>{HOSTS.map(h=><option key={h}>{h}</option>)}</select></label>
            <label>Status kehadiran<div className="status-options">{STATUSES.map(s=><button type="button" key={s} className={`status-option ${s} ${selectedStatus===s?"chosen":""}`} onClick={()=>setSelectedStatus(s)}>{STATUS_LABELS[s]}</button>)}</div></label>
            <label>Catatan <span className="optional">(opsional)</span><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Tambahkan keterangan bila diperlukan..." rows={2}/></label>
            <button className="primary-btn" disabled={saving}>{saving?"Menyimpan...":editingId?"Simpan Perubahan":"Simpan absensi"} <Plus size={17}/></button>
            {editingId && <button type="button" className="logout-btn" onClick={cancelEdit}>Batal Edit</button>}
            {message && <p className="notice">{message}</p>}
          </form>
        </section>}
        <section className="panel roster-panel"><div className="panel-heading"><div><div className="eyebrow">HOST DIRECTORY</div><h3>Tim host</h3></div><Users size={20}/></div>
          {HOSTS.map(h=>{const mine=rows.filter(r=>r.host===h);const worked=mine.filter(r=>r.status==="full"||r.status==="four_hours").length;return <div className="host-row" key={h}><div className={`host-avatar ${h.toLowerCase()}`}>{h[0]}</div><div className="host-info"><b>{h}</b><small>{mine.length} hari tercatat · {worked} hari aktif</small></div><span className="host-dot"/></div>})}
          <div className="roster-note">Satu catatan absensi untuk setiap host pada setiap tanggal. Input ulang tanggal yang sama akan memperbarui status.</div>
        </section>
      </div>
      <section className="panel records-panel"><div className="records-head"><div><div className="eyebrow">ATTENDANCE LOG</div><h3>Riwayat absensi</h3></div><button className="icon-btn" onClick={load} title="Muat ulang"><RefreshCw size={17}/></button></div>
        <div className="filters"><label className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari host, tanggal, catatan..."/></label><input className="month-filter" type="month" value={month} onChange={e=>setMonth(e.target.value)} aria-label="Pilih bulan"/><select value={host} onChange={e=>setHost(e.target.value)}><option>Semua</option>{HOSTS.map(h=><option key={h}>{h}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)}><option>Semua</option>{STATUSES.map(s=><option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></div>
        <div className="table-wrap"><table><thead><tr><th>TANGGAL</th><th>HOST</th><th>STATUS</th><th>CATATAN</th>{isAdmin && <th>AKSI</th>}</tr></thead><tbody>{loading?<tr><td colSpan={5} className="empty">Memuat data...</td></tr>:filtered.length===0?<tr><td colSpan={5} className="empty">Belum ada data pada periode ini.</td></tr>:filtered.map(r=><tr key={r.id}><td>{new Date(`${r.attendance_date}T00:00:00`).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"})}</td><td><b>{r.host}</b></td><td><span className={`status-badge ${r.status}`}>{STATUS_LABELS[r.status]}</span></td><td>{r.note || ""}</td>{isAdmin && <td><button type="button" className="icon-btn" onClick={()=>startEdit(r)}>Edit</button></td>}</tr>)}</tbody></table></div>
        <div className="records-foot"><span>{filtered.length} catatan ditampilkan</span><div className="pdf-actions"><button onClick={()=>exportAttendancePdf(rows,month,"Aulia")}><Download size={15}/> PDF Aulia</button><button onClick={()=>exportAttendancePdf(rows,month,"Eka")}><Download size={15}/> PDF Eka</button><button className="pdf-primary" onClick={()=>exportAttendancePdf(rows,month,"Semua")}><Download size={15}/> PDF Gabungan</button></div></div>
      </section>
      <footer className="app-footer"><div className="footer-brand"><img src="/redbox-logo.png" alt="REDBOX"/><span>REDBOX <small>LIVE ATTENDANCE</small></span></div><span className="footer-tagline">Professional Attendance Solution</span><strong>© {new Date().getFullYear()} <em>Nauell Tech.</em> All rights reserved.</strong></footer>
    </section>
  </main>;
}
function Stat({icon,label,value,tone}:{icon:React.ReactNode,label:string,value:number,tone:string}) {return <div className={`stat-card ${tone}`}><div className="stat-top">{icon}<span>{label}</span></div><strong>{value}</strong><small>Hari tercatat bulan ini</small></div>}




