<<<<<<< HEAD
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Attendance,
  DEFAULT_HOSTS,
  Host,
  HostPhotoRequest,
  HostRecord,
  Status,
  STATUS_LABELS,
} from "@/lib/types";
import {
  compressAvatarFile,
  getLocalHosts,
  getLocalPhotoRequests,
  isMissingTableError,
  saveLocalHosts,
  saveLocalPhotoRequests,
} from "@/lib/host-fallback";
import {
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  HeartPulse,
  ImagePlus,
  Loader2,
  LogIn,
  LogOut,
  Palmtree,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { exportAttendancePdf } from "@/lib/pdf";
import LaunchSplash from "@/components/LaunchSplash";
import AnimatedNumber from "@/components/AnimatedNumber";

const STATUSES: Status[] = ["full", "four_hours", "holiday", "sick"];

type NavTab = "overview" | "hosts" | "history";

function getLocalDateStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getLocalMonthStr(d = new Date()): string {
  return getLocalDateStr(d).slice(0, 7);
}

function getAvatarTone(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return `tone-${sum % 4}`;
}

function HostAvatar({
  name,
  avatarUrl,
  size = "sm",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "lg";
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [avatarUrl]);

  const cls = `host-avatar ${size === "lg" ? "large" : ""} ${getAvatarTone(name)}`;

  if (avatarUrl && !failed) {
    return (
      <div className={`${cls} has-photo`}>
        <img
          src={avatarUrl}
          alt={`Foto profil ${name}`}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return <div className={cls}>{name[0]?.toUpperCase() || "?"}</div>;
}

export default function Dashboard() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [hosts, setHosts] = useState<HostRecord[]>(
    DEFAULT_HOSTS.map((name, idx) => ({ id: `default-${idx}`, name, avatar_url: null }))
  );
  const [photoRequests, setPhotoRequests] = useState<HostPhotoRequest[]>([]);
  const [rows, setRows] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [host, setHost] = useState("Semua");
  const [status, setStatus] = useState("Semua");
  const [month, setMonth] = useState(() => getLocalMonthStr());
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(() => getLocalDateStr());
  const [todayLabel, setTodayLabel] = useState("");
  const [todayIso, setTodayIso] = useState("");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedHost, setSelectedHost] = useState<Host>(DEFAULT_HOSTS[0]);
  const [selectedStatus, setSelectedStatus] = useState<Status>("full");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [exportingTarget, setExportingTarget] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);

  // Fallback flags when remote Supabase hasn't created hosts / host_photo_requests tables yet
  const hostsFallbackRef = useRef(false);
  const photoFallbackRef = useRef(false);

  // Host management states (Admin only)
  const [newHostName, setNewHostName] = useState("");
  const [hostBusy, setHostBusy] = useState(false);
  const [hostNotice, setHostNotice] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [renamingHostId, setRenamingHostId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState("");
  const [confirmDeleteHostId, setConfirmDeleteHostId] = useState<string | null>(null);

  // Public Profile Photo Request modal state (available without login!)
  const [photoModalHost, setPhotoModalHost] = useState<HostRecord | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    setTodayIso(getLocalDateStr());
    setTodayLabel(
      new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
  }, []);

  const activeHostNames = useMemo(() => hosts.map((h) => h.name), [hosts]);
  const hostAvatarMap = useMemo(() => {
    const map = new Map<string, string | null>();
    hosts.forEach((h) => map.set(h.name, h.avatar_url || null));
    return map;
  }, [hosts]);

  const pendingPhotoRequests = useMemo(
    () => photoRequests.filter((r) => r.status === "pending"),
    [photoRequests]
  );

  const filterHostOptions = useMemo(() => {
    const combined = new Set<string>(activeHostNames);
    rows.forEach((r) => combined.add(r.host));
    return Array.from(combined);
  }, [activeHostNames, rows]);

  useEffect(() => {
    if (activeHostNames.length > 0 && !activeHostNames.includes(selectedHost)) {
      setSelectedHost(activeHostNames[0]);
    }
  }, [activeHostNames, selectedHost]);
=======
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
>>>>>>> 335cafa28b6e8524310779a6d02437148a1f79ca

  function startEdit(r: Attendance) {
    setEditingId(r.id);
    setDate(r.attendance_date);
    setSelectedHost(r.host);
    setSelectedStatus(r.status);
    setNote(r.note || "");
<<<<<<< HEAD
    setActiveTab("overview");
    setMessage(`Mode edit aktif untuk ${r.host} (${r.attendance_date}).`);
=======
    setMessage("Mode edit: " + r.host);
>>>>>>> 335cafa28b6e8524310779a6d02437148a1f79ca
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setNote("");
    setMessage("Edit dibatalkan.");
  }

<<<<<<< HEAD
  async function loadHosts() {
    if (
      hostsFallbackRef.current ||
      (typeof window !== "undefined" &&
        window.sessionStorage.getItem("redbox_hosts_fallback") === "1")
    ) {
      hostsFallbackRef.current = true;
      setHosts(getLocalHosts());
      return;
    }

    const { data, error } = await supabase
      .from("hosts")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      if (isMissingTableError(error)) {
        hostsFallbackRef.current = true;
        try {
          window.sessionStorage.setItem("redbox_hosts_fallback", "1");
        } catch {}
        setHosts(getLocalHosts());
      }
      return;
    }

    if (Array.isArray(data)) {
      setHosts(data as HostRecord[]);
    }
  }

  async function loadPhotoRequests() {
    if (
      photoFallbackRef.current ||
      (typeof window !== "undefined" &&
        window.sessionStorage.getItem("redbox_photo_fallback") === "1")
    ) {
      photoFallbackRef.current = true;
      setPhotoRequests(getLocalPhotoRequests());
      return;
    }

    const { data, error } = await supabase
      .from("host_photo_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingTableError(error)) {
        photoFallbackRef.current = true;
        try {
          window.sessionStorage.setItem("redbox_photo_fallback", "1");
        } catch {}
        setPhotoRequests(getLocalPhotoRequests());
      }
      return;
    }

    if (Array.isArray(data)) {
      setPhotoRequests(data as HostPhotoRequest[]);
    }
  }

  async function load(isManual = false) {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    const start = `${month}-01`;
    const endDate = new Date(
      Number(month.slice(0, 4)),
      Number(month.slice(5, 7)),
      0
    ).getDate();
    const end = `${month}-${String(endDate).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .gte("attendance_date", start)
      .lte("attendance_date", end)
      .order("attendance_date", { ascending: false });

    if (error) setMessage(error.message);
    else setRows((data || []) as Attendance[]);

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    let active = true;

    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
=======
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
>>>>>>> 335cafa28b6e8524310779a6d02437148a1f79ca

      if (!active) return;

      if (!user) {
<<<<<<< HEAD
        setAuthEmail(null);
=======
>>>>>>> 335cafa28b6e8524310779a6d02437148a1f79ca
        setIsAdmin(false);
        return;
      }

<<<<<<< HEAD
      setAuthEmail(user.email || "Akun aktif");

=======
>>>>>>> 335cafa28b6e8524310779a6d02437148a1f79ca
      const { data, error } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (active) setIsAdmin(!error && !!data);
    }

    checkAdmin();
<<<<<<< HEAD
    loadHosts();
    loadPhotoRequests();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
=======

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
>>>>>>> 335cafa28b6e8524310779a6d02437148a1f79ca
      checkAdmin();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
<<<<<<< HEAD
  }, [supabase]);

  useEffect(() => {
    setSelectedDay(null);
    load();
  }, [month]);

  useEffect(() => {
    const channel = supabase
      .channel("redbox-attendance-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        () => {
          load();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hosts" },
        () => {
          if (!hostsFallbackRef.current) loadHosts();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "host_photo_requests" },
        () => {
          if (!photoFallbackRef.current) loadPhotoRequests();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [month, supabase]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (host === "Semua" || r.host === host) &&
          (status === "Semua" || r.status === status) &&
          (!selectedDay || r.attendance_date === selectedDay) &&
          (!search ||
            `${r.host} ${r.note || ""} ${r.attendance_date}`
              .toLowerCase()
              .includes(search.toLowerCase()))
      ),
    [rows, host, status, search, selectedDay]
  );

  const counts = useMemo(() => {
    const result: Record<Status, number> = {
      full: 0,
      four_hours: 0,
      holiday: 0,
      sick: 0,
    };
    rows.forEach((r) => result[r.status]++);
    return result;
  }, [rows]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedHost) {
      setMessage("Tambahkan minimal satu host terlebih dahulu.");
      return;
    }
=======
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
>>>>>>> 335cafa28b6e8524310779a6d02437148a1f79ca
    setSaving(true);
    setMessage("");

    const payload = {
      attendance_date: date,
      host: selectedHost,
      status: selectedStatus,
<<<<<<< HEAD
      note: note.trim() || null,
=======
      note: note.trim() || null
>>>>>>> 335cafa28b6e8524310779a6d02437148a1f79ca
    };

    const result = editingId
      ? await supabase.from("attendance").update(payload).eq("id", editingId)
<<<<<<< HEAD
      : await supabase
          .from("attendance")
          .upsert(payload, { onConflict: "attendance_date,host" });
=======
      : await supabase.from("attendance").upsert(payload, { onConflict: "attendance_date,host" });
>>>>>>> 335cafa28b6e8524310779a6d02437148a1f79ca

    setSaving(false);

    if (result.error) {
      setMessage(result.error.message);
    } else {
<<<<<<< HEAD
      setMessage(
        editingId
          ? "Perubahan absensi berhasil disimpan."
          : "Absensi baru berhasil disimpan."
      );
      setEditingId(null);
      setNote("");
      if (date.slice(0, 7) === month) await load(true);
    }
  }

  async function handleAddHost(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newHostName.trim();
    if (!trimmed) return;

    if (hosts.some((h) => h.name.toLowerCase() === trimmed.toLowerCase())) {
      setHostNotice({
        type: "err",
        text: `Host "${trimmed}" sudah ada di daftar.`,
      });
      return;
    }

    setHostBusy(true);
    setHostNotice(null);

    if (!hostsFallbackRef.current) {
      const { error } = await supabase.from("hosts").insert({ name: trimmed });
      if (!error) {
        setHostBusy(false);
        setNewHostName("");
        setHostNotice({ type: "ok", text: `Host "${trimmed}" berhasil ditambahkan.` });
        await loadHosts();
        return;
      }
      if (!isMissingTableError(error)) {
        setHostBusy(false);
        setHostNotice({ type: "err", text: error.message });
        return;
      }
      hostsFallbackRef.current = true;
    }

    const updated = [
      ...getLocalHosts(),
      {
        id: `local-${Date.now()}`,
        name: trimmed,
        avatar_url: null,
        created_at: new Date().toISOString(),
      },
    ];
    saveLocalHosts(updated);
    setHosts(updated);
    setHostBusy(false);
    setNewHostName("");
    setHostNotice({ type: "ok", text: `Host "${trimmed}" berhasil ditambahkan.` });
  }

  function startRenameHost(h: HostRecord) {
    setConfirmDeleteHostId(null);
    setRenamingHostId(h.id);
    setRenamingValue(h.name);
    setHostNotice(null);
  }

  async function submitRenameHost(e: React.FormEvent, target: HostRecord) {
    e.preventDefault();
    const trimmed = renamingValue.trim();
    if (!trimmed) return;

    if (trimmed === target.name) {
      setRenamingHostId(null);
      return;
    }

    if (
      hosts.some(
        (h) => h.id !== target.id && h.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setHostNotice({
        type: "err",
        text: `Nama host "${trimmed}" sudah digunakan.`,
      });
      return;
    }

    setHostBusy(true);
    setHostNotice(null);

    if (!hostsFallbackRef.current) {
      const { error: hostErr } = await supabase
        .from("hosts")
        .update({ name: trimmed })
        .eq("id", target.id);

      if (hostErr && !isMissingTableError(hostErr)) {
        setHostBusy(false);
        setHostNotice({ type: "err", text: hostErr.message });
        return;
      }
      if (hostErr && isMissingTableError(hostErr)) {
        hostsFallbackRef.current = true;
      }
    }

    if (hostsFallbackRef.current) {
      const updated = hosts.map((h) =>
        h.id === target.id ? { ...h, name: trimmed } : h
      );
      saveLocalHosts(updated);
      setHosts(updated);
    }

    const { error: attErr } = await supabase
      .from("attendance")
      .update({ host: trimmed })
      .eq("host", target.name);

    setHostBusy(false);
    setRenamingHostId(null);

    if (selectedHost === target.name) setSelectedHost(trimmed);
    if (host === target.name) setHost(trimmed);

    if (attErr) {
      setHostNotice({
        type: "err",
        text: `Nama host diubah, tetapi riwayat gagal diperbarui: ${attErr.message}`,
      });
    } else {
      setHostNotice({
        type: "ok",
        text: `Host "${target.name}" berhasil diganti menjadi "${trimmed}".`,
      });
    }

    await Promise.all([loadHosts(), load(true)]);
  }

  async function confirmDeleteHost(target: HostRecord) {
    setHostBusy(true);
    setHostNotice(null);

    if (!hostsFallbackRef.current) {
      const { error } = await supabase.from("hosts").delete().eq("id", target.id);
      if (error && !isMissingTableError(error)) {
        setHostBusy(false);
        setHostNotice({ type: "err", text: error.message });
        return;
      }
      if (error && isMissingTableError(error)) {
        hostsFallbackRef.current = true;
      }
    }

    if (hostsFallbackRef.current) {
      const updated = hosts.filter((h) => h.id !== target.id);
      saveLocalHosts(updated);
      setHosts(updated);
    }

    setHostBusy(false);
    setConfirmDeleteHostId(null);

    if (host === target.name) setHost("Semua");
    setHostNotice({
      type: "ok",
      text: `Host "${target.name}" dihapus dari daftar aktif (resign).`,
    });

    await loadHosts();
  }

  // Open photo change modal (accessible without login!)
  function openPhotoModal(target: HostRecord) {
    setPhotoModalHost(target);
    setPhotoPreviewUrl("");
    setPhotoUrlInput("");
    setRequesterName("");
    setPhotoError("");
  }

  async function handlePhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError("");
    try {
      const compressed = await compressAvatarFile(file);
      setPhotoPreviewUrl(compressed);
      setPhotoUrlInput("");
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Gagal memproses foto.");
    }
  }

  function handleUrlInputChange(val: string) {
    setPhotoUrlInput(val);
    setPhotoError("");
    const trimmed = val.trim();
    if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
      setPhotoPreviewUrl(trimmed);
    } else if (!trimmed) {
      setPhotoPreviewUrl("");
    }
  }

  async function submitPhotoRequest(e: React.FormEvent, applyDirectly = false) {
    e.preventDefault();
    if (!photoModalHost) return;
    const candidate = photoPreviewUrl.trim();
    if (!candidate) {
      setPhotoError("Pilih foto dari perangkat atau masukkan URL foto terlebih dahulu.");
      return;
    }

    setPhotoBusy(true);
    setPhotoError("");

    // Direct admin update if Admin chose "Terapkan Langsung"
    if (applyDirectly && isAdmin) {
      if (!hostsFallbackRef.current) {
        const { error } = await supabase
          .from("hosts")
          .update({ avatar_url: candidate })
          .eq("id", photoModalHost.id);
        if (error && !isMissingTableError(error)) {
          setPhotoBusy(false);
          setPhotoError(error.message);
          return;
        }
        if (error && isMissingTableError(error)) {
          hostsFallbackRef.current = true;
        }
      }

      if (hostsFallbackRef.current) {
        const updated = hosts.map((h) =>
          h.id === photoModalHost.id ? { ...h, avatar_url: candidate } : h
        );
        saveLocalHosts(updated);
        setHosts(updated);
      }

      await loadHosts();
      setPhotoBusy(false);
      setPhotoModalHost(null);
      setHostNotice({
        type: "ok",
        text: `Foto profil ${photoModalHost.name} berhasil diperbarui.`,
      });
      return;
    }

    // Standard public submission -> status "pending" waiting for admin approval
    const payload = {
      host_name: photoModalHost.name,
      photo_data_url: candidate,
      requested_by: requesterName.trim() || "Pengunjung / Host",
      status: "pending" as const,
    };

    if (!photoFallbackRef.current) {
      const { error } = await supabase.from("host_photo_requests").insert(payload);
      if (!error) {
        setPhotoBusy(false);
        setPhotoModalHost(null);
        setHostNotice({
          type: "ok",
          text: `Pengajuan ganti foto profil untuk ${photoModalHost.name} terkirim dan menunggu persetujuan Admin.`,
        });
        await loadPhotoRequests();
        return;
      }
      if (!isMissingTableError(error)) {
        setPhotoBusy(false);
        setPhotoError(error.message);
        return;
      }
      photoFallbackRef.current = true;
    }

    const newReq: HostPhotoRequest = {
      id: `req-${Date.now()}`,
      created_at: new Date().toISOString(),
      ...payload,
    };
    const updatedReqs = [newReq, ...getLocalPhotoRequests()];
    saveLocalPhotoRequests(updatedReqs);
    setPhotoRequests(updatedReqs);
    setPhotoBusy(false);
    setPhotoModalHost(null);
    setHostNotice({
      type: "ok",
      text: `Pengajuan ganti foto profil untuk ${photoModalHost.name} terkirim dan menunggu persetujuan Admin.`,
    });
  }

  async function reviewPhotoRequest(
    req: HostPhotoRequest,
    decision: "approved" | "rejected"
  ) {
    if (!isAdmin) return;
    setReviewingId(req.id);
    setHostNotice(null);

    if (decision === "approved") {
      if (!hostsFallbackRef.current) {
        const { error: hostErr } = await supabase
          .from("hosts")
          .update({ avatar_url: req.photo_data_url })
          .eq("name", req.host_name);

        if (hostErr && !isMissingTableError(hostErr)) {
          setReviewingId(null);
          setHostNotice({ type: "err", text: hostErr.message });
          return;
        }
        if (hostErr && isMissingTableError(hostErr)) {
          hostsFallbackRef.current = true;
        }
      }

      if (hostsFallbackRef.current) {
        const updatedHosts = hosts.map((h) =>
          h.name === req.host_name ? { ...h, avatar_url: req.photo_data_url } : h
        );
        saveLocalHosts(updatedHosts);
        setHosts(updatedHosts);
      }
    }

    const reviewedAt = new Date().toISOString();
    if (!photoFallbackRef.current) {
      const { error: reqErr } = await supabase
        .from("host_photo_requests")
        .update({ status: decision, reviewed_at: reviewedAt })
        .eq("id", req.id);

      if (reqErr && !isMissingTableError(reqErr)) {
        setReviewingId(null);
        setHostNotice({ type: "err", text: reqErr.message });
        return;
      }
      if (reqErr && isMissingTableError(reqErr)) {
        photoFallbackRef.current = true;
      }
    }

    if (photoFallbackRef.current) {
      const updatedReqs = photoRequests.map((r) =>
        r.id === req.id ? { ...r, status: decision, reviewed_at: reviewedAt } : r
      );
      saveLocalPhotoRequests(updatedReqs);
      setPhotoRequests(updatedReqs);
    }

    setReviewingId(null);
    setHostNotice({
      type: "ok",
      text:
        decision === "approved"
          ? `Foto profil ${req.host_name} disetujui dan langsung diterapkan.`
          : `Pengajuan foto profil untuk ${req.host_name} ditolak.`,
    });

    await Promise.all([loadHosts(), loadPhotoRequests()]);
  }

  async function handleExport(target: Host | "Semua") {
    setExportingTarget(target);
    try {
      await exportAttendancePdf(rows, month, target, activeHostNames);
    } finally {
      window.setTimeout(() => setExportingTarget(null), 350);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setAuthEmail(null);
    setIsAdmin(false);
    router.push("/login");
  }

  function handleDayClick(dateKey: string) {
    setSelectedDay((prev) => (prev === dateKey ? null : dateKey));
    if (isAdmin) setDate(dateKey);
  }

  function resetFilters() {
    setHost("Semua");
    setStatus("Semua");
    setSearch("");
    setSelectedDay(null);
  }

=======
      setMessage(editingId ? "Perubahan absensi berhasil disimpan." : "Absensi berhasil disimpan.");
      setEditingId(null);
      setNote("");
      if (date.slice(0,7) === month) await load();
    }
  }
  async function logout() { await supabase.auth.signOut(); router.push("/login"); }
  const today = new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
>>>>>>> 335cafa28b6e8524310779a6d02437148a1f79ca
  const [calendarYear, calendarMonth] = month.split("-").map(Number);
  const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
  const firstWeekday = new Date(calendarYear, calendarMonth - 1, 1).getDay();
  const calendarCells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
<<<<<<< HEAD
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const monthLabel = new Date(calendarYear, calendarMonth - 1, 1).toLocaleDateString(
    "id-ID",
    { month: "long", year: "numeric" }
  );
  const recentRows = rows.slice(0, 5);
  const hasActiveFilters =
    host !== "Semua" || status !== "Semua" || Boolean(search) || Boolean(selectedDay);

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview", label: "Dashboard", icon: <CalendarDays size={17} /> },
    {
      id: "hosts",
      label: "Data Host",
      icon: <Users size={17} />,
      badge: isAdmin && pendingPhotoRequests.length > 0 ? pendingPhotoRequests.length : undefined,
    },
    { id: "history", label: "Riwayat Absensi", icon: <Clock3 size={17} /> },
  ];

  const pageTitles: Record<NavTab, string> = {
    overview: "Dashboard",
    hosts: "Data Host",
    history: "Riwayat Absensi",
  };

  return (
    <main className="dashboard-shell">
      <LaunchSplash subtitle="Memuat Ruang Operasional REDBOX" durationMs={620} />

      <aside className="sidebar">
        <div className="sidebar-brand">
          {logoFailed ? (
            <div className="side-logo-fallback">RB</div>
          ) : (
            <img
              className="side-logo"
              src="/redbox-logo.png"
              alt="Logo REDBOX"
              referrerPolicy="no-referrer"
              onError={() => setLogoFailed(true)}
            />
          )}
          <div>
            <b>REDBOX</b>
            <small>Live Attendance</small>
          </div>
        </div>

        <div className="side-caption">Navigasi</div>

        <nav className="side-nav" aria-label="Navigasi utama">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`side-nav-btn ${active ? "active" : ""}`}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active-indicator"
                    className="side-active-bg"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="side-nav-content">
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="nav-count-badge tabular-nums">{item.badge}</span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-brand-note">
          <b>REDBOX Studio</b>
          <strong>Manajemen Kehadiran</strong>
          <small className="tabular-nums">
            {hosts.length} Host Aktif · Laporan A4
          </small>
        </div>

        <div className="sidebar-bottom">
          {isAdmin ? (
            <>
              <div className="admin-chip">
                <div className="admin-avatar">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <b>Administrator</b>
                  <small>{authEmail || "Akses Penuh Aktif"}</small>
                </div>
              </div>
              <button type="button" className="logout-btn" onClick={logout}>
                <LogOut size={16} />
                <span>Keluar Sesi</span>
              </button>
            </>
          ) : authEmail ? (
            <>
              <div className="admin-chip">
                <div className="admin-avatar">
                  <Users size={16} />
                </div>
                <div>
                  <b>{authEmail}</b>
                  <small>Belum terdaftar admin</small>
                </div>
              </div>
              <button type="button" className="logout-btn" onClick={logout}>
                <LogOut size={16} />
                <span>Ganti Akun</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="sidebar-login-btn"
              onClick={() => router.push("/login")}
            >
              <LogIn size={16} />
              <span>Menu Masuk Admin</span>
            </button>
          )}
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div>
            <div className="breadcrumb-line">
              <span>REDBOX</span>
              <span aria-hidden="true">/</span>
              <span>Operasional</span>
              {todayLabel && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{todayLabel}</span>
                </>
              )}
            </div>
            <h1>{pageTitles[activeTab]}</h1>
          </div>

          <div className="topbar-right">
            <label className="topbar-month-picker" aria-label="Pilih bulan laporan">
              <CalendarDays size={15} />
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </label>

            {isAdmin ? (
              <button
                type="button"
                className="topbar-cta secondary"
                onClick={() => handleExport("Semua")}
                disabled={exportingTarget !== null}
              >
                {exportingTarget === "Semua" ? (
                  <Loader2 size={15} className="spin-icon" />
                ) : (
                  <Download size={15} />
                )}
                <span>Ekspor PDF</span>
              </button>
            ) : (
              <button
                type="button"
                className="topbar-cta"
                onClick={() => router.push("/login")}
              >
                <LogIn size={15} />
                <span>Portal Masuk</span>
              </button>
            )}
          </div>
        </header>

        {/* Mobile Tab Switcher */}
        <div className="mobile-tabs" role="tablist" aria-label="Menu halaman">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
              className={`mobile-tab-btn ${activeTab === item.id ? "active" : ""}`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="nav-count-badge tabular-nums">{item.badge}</span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="tab-overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              <section className="hero-panel">
                <div className="hero-grid-pattern" />
                <div className="hero-glow" />
                <div className="hero-copy">
                  <p className="hero-kicker">Host Performance Tracker · {monthLabel}</p>
                  <h2>
                    Good work deserves
                    <br />
                    <em>to be seen.</em>
                  </h2>
                  <p className="hero-sub">
                    Pantau kehadiran Host Redbox secara terstruktur dengan rekap bulanan instan.
                  </p>
                </div>
                <div className="hero-actions">
                  <button
                    type="button"
                    className="hero-btn"
                    onClick={() => handleExport("Semua")}
                    disabled={exportingTarget !== null}
                  >
                    {exportingTarget === "Semua" ? (
                      <Loader2 size={16} className="spin-icon" />
                    ) : (
                      <Download size={16} />
                    )}
                    <span>Unduh Laporan {monthLabel}</span>
                  </button>
                </div>
              </section>

              <section className="stat-grid">
                <Stat
                  icon={<CheckCircle2 size={17} />}
                  label="Shift Full"
                  value={counts.full}
                  tone="green"
                  loading={loading}
                  delay={0}
                />
                <Stat
                  icon={<Clock3 size={17} />}
                  label="Shift 4 Jam"
                  value={counts.four_hours}
                  tone="yellow"
                  loading={loading}
                  delay={0.04}
                />
                <Stat
                  icon={<Palmtree size={17} />}
                  label="Libur"
                  value={counts.holiday}
                  tone="red"
                  loading={loading}
                  delay={0.08}
                />
                <Stat
                  icon={<HeartPulse size={17} />}
                  label="Sakit"
                  value={counts.sick}
                  tone="blue"
                  loading={loading}
                  delay={0.12}
                />
              </section>

              <div className="overview-grid">
                <section className="panel calendar-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="panel-kicker">Ringkasan Bulanan</p>
                      <h3>Kalender Absensi</h3>
                    </div>
                    <span className="panel-icon">
                      <CalendarDays size={18} />
                    </span>
                  </div>

                  <div className="calendar-month">
                    <b>{monthLabel}</b>
                    <span className="calendar-hint">
                      {selectedDay
                        ? `Filter tanggal: ${selectedDay}`
                        : "Klik tanggal untuk menyaring riwayat"}
                    </span>
                  </div>

                  <div className="calendar-grid">
                    {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
                      <div className="calendar-weekday" key={day}>
                        {day}
                      </div>
                    ))}
                    {calendarCells.map((day, index) => {
                      if (!day)
                        return <div className="calendar-day blank" key={`blank-${index}`} />;
                      const dateKey = `${month}-${String(day).padStart(2, "0")}`;
                      const dayRows = rows.filter((r) => r.attendance_date === dateKey);
                      const isToday = todayIso === dateKey;
                      const isSelected = selectedDay === dateKey;
                      return (
                        <button
                          type="button"
                          onClick={() => handleDayClick(dateKey)}
                          className={`calendar-day ${isToday ? "today" : ""} ${
                            isSelected ? "selected" : ""
                          }`}
                          key={dateKey}
                        >
                          <span className="tabular-nums">{day}</span>
                          <div className="calendar-dots">
                            {dayRows.map((r) => (
                              <i
                                key={r.id}
                                className={`dot-${r.status}`}
                                title={`${r.host}: ${STATUS_LABELS[r.status]}`}
                              />
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="calendar-legend">
                    <span>
                      <i className="dot-full" /> Full
                    </span>
                    <span>
                      <i className="dot-four_hours" /> 4 Jam
                    </span>
                    <span>
                      <i className="dot-holiday" /> Libur
                    </span>
                    <span>
                      <i className="dot-sick" /> Sakit
                    </span>
                  </div>
                </section>

                <section className="panel activity-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="panel-kicker">Pembaruan Data</p>
                      <h3>Aktivitas Terbaru</h3>
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => load(true)}
                      title="Muat ulang data"
                    >
                      <RefreshCw size={16} className={refreshing ? "spin-icon" : ""} />
                    </button>
                  </div>

                  <div className="activity-list">
                    {loading ? (
                      Array.from({ length: 4 }).map((_, idx) => (
                        <div className="activity-skeleton" key={idx}>
                          <div className="skel skel-avatar" />
                          <div className="skel-lines">
                            <div className="skel skel-title" />
                            <div className="skel skel-sub" />
                          </div>
                          <div className="skel skel-badge" />
                        </div>
                      ))
                    ) : recentRows.length === 0 ? (
                      <div className="activity-empty">
                        <p>Belum ada catatan absensi pada bulan ini.</p>
                        {!isAdmin && (
                          <button
                            type="button"
                            className="inline-link-btn"
                            onClick={() => router.push("/login")}
                          >
                            Masuk sebagai Admin untuk mulai mencatat
                          </button>
                        )}
                      </div>
                    ) : (
                      recentRows.map((r, idx) => (
                        <motion.div
                          className="activity-row"
                          key={r.id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04, duration: 0.2 }}
                        >
                          <HostAvatar
                            name={r.host}
                            avatarUrl={hostAvatarMap.get(r.host)}
                          />
                          <div className="host-info">
                            <b>{r.host}</b>
                            <small className="tabular-nums">
                              {new Date(`${r.attendance_date}T00:00:00`).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                              {r.note ? ` · ${r.note}` : ""}
                            </small>
                          </div>
                          <span className={`status-badge ${r.status}`}>
                            {STATUS_LABELS[r.status]}
                          </span>
                        </motion.div>
                      ))
                    )}
                  </div>
                </section>
              </div>

              <div className={`content-grid ${isAdmin ? "" : "single-col"}`}>
                {isAdmin && (
                  <section className="panel entry-panel">
                    <div className="panel-heading">
                      <div>
                        <p className="panel-kicker">Input Harian</p>
                        <h3>{editingId ? "Edit Absensi" : "Tambah Absensi"}</h3>
                      </div>
                      <span className="panel-icon">
                        <Plus size={18} />
                      </span>
                    </div>

                    <form onSubmit={save} className="entry-form">
                      <div className="form-two-col">
                        <label>
                          Tanggal
                          <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                          />
                        </label>
                        <label>
                          Nama host
                          <select
                            value={selectedHost}
                            onChange={(e) => setSelectedHost(e.target.value)}
                            disabled={activeHostNames.length === 0}
                          >
                            {activeHostNames.length === 0 ? (
                              <option value="">Belum ada host</option>
                            ) : (
                              activeHostNames.map((h) => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))
                            )}
                          </select>
                        </label>
                      </div>

                      <label>
                        Status kehadiran
                        <div className="status-options">
                          {STATUSES.map((s) => (
                            <button
                              type="button"
                              key={s}
                              className={`status-option ${s} ${
                                selectedStatus === s ? "chosen" : ""
                              }`}
                              onClick={() => setSelectedStatus(s)}
                            >
                              {STATUS_LABELS[s]}
                            </button>
                          ))}
                        </div>
                      </label>

                      <label>
                        Catatan <span className="optional">(opsional)</span>
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Tambahkan keterangan bila diperlukan..."
                          rows={2}
                        />
                      </label>

                      <div className="form-actions">
                        <motion.button
                          type="submit"
                          className="primary-btn"
                          disabled={saving || activeHostNames.length === 0}
                          whileTap={{ scale: 0.99 }}
                        >
                          {saving ? (
                            <>
                              <Loader2 size={16} className="spin-icon" />
                              <span>Menyimpan...</span>
                            </>
                          ) : (
                            <>
                              <Plus size={16} />
                              <span>
                                {editingId ? "Simpan Perubahan" : "Simpan Absensi"}
                              </span>
                            </>
                          )}
                        </motion.button>
                        {editingId && (
                          <button
                            type="button"
                            className="cancel-edit-btn"
                            onClick={cancelEdit}
                          >
                            <X size={15} />
                            <span>Batal</span>
                          </button>
                        )}
                      </div>

                      <AnimatePresence>
                        {message && (
                          <motion.p
                            className="notice"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                          >
                            {message}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </form>
                  </section>
                )}

                <section className="panel roster-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="panel-kicker">Direktori Host</p>
                      <h3>Tim Host Live</h3>
                    </div>
                    <button
                      type="button"
                      className="text-action-btn"
                      onClick={() => setActiveTab("hosts")}
                    >
                      {isAdmin ? "Kelola Host" : "Lihat & Ganti Foto"}
                    </button>
                  </div>

                  {hosts.length === 0 ? (
                    <div className="activity-empty">
                      <p>Belum ada host aktif terdaftar.</p>
                      {isAdmin && (
                        <button
                          type="button"
                          className="inline-link-btn"
                          onClick={() => setActiveTab("hosts")}
                        >
                          Tambah Host Baru
                        </button>
                      )}
                    </div>
                  ) : (
                    hosts.map((h) => {
                      const mine = rows.filter((r) => r.host === h.name);
                      const worked = mine.filter(
                        (r) => r.status === "full" || r.status === "four_hours"
                      ).length;
                      const rate =
                        mine.length > 0 ? Math.round((worked / mine.length) * 100) : 0;
                      const pendingCount = pendingPhotoRequests.filter(
                        (r) => r.host_name === h.name
                      ).length;

                      return (
                        <div className="host-row" key={h.id}>
                          <HostAvatar name={h.name} avatarUrl={h.avatar_url} />
                          <div className="host-info">
                            <b>{h.name}</b>
                            <small className="tabular-nums">
                              {mine.length} hari tercatat · {worked} hari aktif ({rate}%)
                              {pendingCount > 0
                                ? ` · ${pendingCount} pengajuan foto`
                                : ""}
                            </small>
                          </div>
                          <div className="host-row-actions">
                            <button
                              type="button"
                              className="host-filter-btn"
                              onClick={() => openPhotoModal(h)}
                              title={`Ajukan ganti foto profil ${h.name}`}
                            >
                              <Camera size={13} />
                              <span>Foto</span>
                            </button>
                            <button
                              type="button"
                              className="host-filter-btn"
                              onClick={() => {
                                setHost(h.name);
                                setActiveTab("history");
                              }}
                            >
                              Riwayat
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}

                  <div className="roster-note">
                    Pengajuan perubahan foto profil host dapat dikirim langsung tanpa login, dan
                    akan diterapkan setelah disetujui Admin.
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {activeTab === "hosts" && (
            <motion.div
              key="tab-hosts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="hosts-tab-stack"
            >
              {/* Public & Admin Feedback Banner */}
              <AnimatePresence>
                {hostNotice && (
                  <motion.p
                    className={`host-notice ${hostNotice.type}`}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                  >
                    {hostNotice.text}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Admin Approval Queue for Host Profile Photo Requests */}
              {isAdmin && pendingPhotoRequests.length > 0 && (
                <section className="panel approval-panel">
                  <div className="host-manager-head">
                    <div>
                      <p className="panel-kicker">Persetujuan Admin Diperlukan</p>
                      <h3>Antrean Ganti Foto Profil Host</h3>
                    </div>
                    <span className="host-count-text tabular-nums">
                      {pendingPhotoRequests.length} Menunggu Persetujuan
                    </span>
                  </div>

                  <div className="approval-list">
                    {pendingPhotoRequests.map((req) => {
                      const currentAvatar = hostAvatarMap.get(req.host_name);
                      const isBusy = reviewingId === req.id;
                      return (
                        <div className="approval-item" key={req.id}>
                          <div className="approval-compare">
                            <HostAvatar
                              name={req.host_name}
                              avatarUrl={currentAvatar}
                            />
                            <span className="approval-arrow" aria-hidden="true">
                              →
                            </span>
                            <div className="host-avatar has-photo">
                              <img
                                src={req.photo_data_url}
                                alt={`Usulan foto ${req.host_name}`}
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>

                          <div className="approval-meta">
                            <b>{req.host_name}</b>
                            <small>
                              Pengaju: {req.requested_by || "Pengunjung / Host"} ·{" "}
                              {new Date(req.created_at).toLocaleString("id-ID", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </small>
                          </div>

                          <div className="approval-actions">
                            <button
                              type="button"
                              className="approve-btn"
                              disabled={isBusy}
                              onClick={() => reviewPhotoRequest(req, "approved")}
                            >
                              {isBusy ? (
                                <Loader2 size={14} className="spin-icon" />
                              ) : (
                                <Check size={14} />
                              )}
                              <span>Setujui</span>
                            </button>
                            <button
                              type="button"
                              className="icon-btn danger-outline"
                              disabled={isBusy}
                              onClick={() => reviewPhotoRequest(req, "rejected")}
                            >
                              <X size={14} />
                              <span>Tolak</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {isAdmin && (
                <section className="panel host-manager-panel">
                  <div className="host-manager-head">
                    <div>
                      <p className="panel-kicker">Manajemen Tim Studio</p>
                      <h3>Kelola Host Live</h3>
                    </div>
                    <span className="host-count-text tabular-nums">
                      {hosts.length} Host Aktif
                    </span>
                  </div>

                  <form onSubmit={handleAddHost} className="host-add-form">
                    <input
                      type="text"
                      value={newHostName}
                      onChange={(e) => setNewHostName(e.target.value)}
                      placeholder="Masukkan nama host baru (mis. Nadya)..."
                      maxLength={40}
                      required
                    />
                    <motion.button
                      type="submit"
                      className="primary-btn"
                      disabled={hostBusy || !newHostName.trim()}
                      whileTap={{ scale: 0.99 }}
                    >
                      {hostBusy ? (
                        <Loader2 size={16} className="spin-icon" />
                      ) : (
                        <UserPlus size={16} />
                      )}
                      <span>Tambah Host</span>
                    </motion.button>
                  </form>
                </section>
              )}

              {hosts.length === 0 ? (
                <section className="panel activity-empty">
                  <p>Belum ada host aktif. Tambahkan host baru untuk mulai mencatat absensi.</p>
                </section>
              ) : (
                <div className="hosts-view-grid">
                  {hosts.map((h) => {
                    const mine = rows.filter((r) => r.host === h.name);
                    const fullCount = mine.filter((r) => r.status === "full").length;
                    const fourCount = mine.filter((r) => r.status === "four_hours").length;
                    const holidayCount = mine.filter((r) => r.status === "holiday").length;
                    const sickCount = mine.filter((r) => r.status === "sick").length;
                    const worked = fullCount + fourCount;
                    const ratio = mine.length > 0 ? worked / mine.length : 0;
                    const isRenaming = renamingHostId === h.id;
                    const isConfirmingDelete = confirmDeleteHostId === h.id;
                    const pendingForHost = pendingPhotoRequests.filter(
                      (r) => r.host_name === h.name
                    ).length;

                    return (
                      <section className="panel host-detail-card" key={h.id}>
                        <div className="host-detail-head">
                          <div className="host-detail-identity">
                            <HostAvatar
                              name={h.name}
                              avatarUrl={h.avatar_url}
                              size="lg"
                            />
                            {isRenaming ? (
                              <form
                                onSubmit={(e) => submitRenameHost(e, h)}
                                className="host-rename-form"
                              >
                                <input
                                  type="text"
                                  value={renamingValue}
                                  onChange={(e) => setRenamingValue(e.target.value)}
                                  maxLength={40}
                                  autoFocus
                                  aria-label={`Nama baru untuk ${h.name}`}
                                  required
                                />
                                <button
                                  type="submit"
                                  className="host-action-save"
                                  disabled={hostBusy}
                                  title="Simpan nama"
                                >
                                  {hostBusy ? (
                                    <Loader2 size={14} className="spin-icon" />
                                  ) : (
                                    <Check size={14} />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  className="host-action-cancel"
                                  onClick={() => setRenamingHostId(null)}
                                  title="Batal"
                                >
                                  <X size={14} />
                                </button>
                              </form>
                            ) : (
                              <div>
                                <h3>{h.name}</h3>
                                <p className="muted">
                                  Host Live · {monthLabel}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="host-card-actions">
                            {!isRenaming && (
                              <button
                                type="button"
                                className="icon-btn"
                                onClick={() => openPhotoModal(h)}
                                title={`Ganti foto profil ${h.name}`}
                              >
                                <Camera size={14} />
                                <span>Ganti Foto</span>
                              </button>
                            )}

                            {isAdmin && !isRenaming && (
                              <>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  onClick={() => startRenameHost(h)}
                                  title={`Ganti nama ${h.name}`}
                                >
                                  <Pencil size={14} />
                                  <span>Ganti Nama</span>
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn danger-outline"
                                  onClick={() => {
                                    setRenamingHostId(null);
                                    setConfirmDeleteHostId(
                                      isConfirmingDelete ? null : h.id
                                    );
                                  }}
                                  title={`Hapus host ${h.name} (resign)`}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              className="pdf-inline-btn"
                              onClick={() => handleExport(h.name)}
                              disabled={exportingTarget !== null}
                            >
                              {exportingTarget === h.name ? (
                                <Loader2 size={14} className="spin-icon" />
                              ) : (
                                <Download size={14} />
                              )}
                              <span>PDF</span>
                            </button>
                          </div>
                        </div>

                        {pendingForHost > 0 && (
                          <div className="pending-photo-note">
                            <Clock3 size={14} />
                            <span>
                              {pendingForHost} pengajuan foto profil baru menunggu
                              persetujuan Admin.
                            </span>
                          </div>
                        )}

                        <AnimatePresence>
                          {isConfirmingDelete && (
                            <motion.div
                              className="host-delete-confirm"
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                            >
                              <span>
                                Hapus <b>{h.name}</b> dari daftar host aktif (resign)?
                                Riwayat absensi lama tetap tersimpan.
                              </span>
                              <div className="host-delete-buttons">
                                <button
                                  type="button"
                                  className="danger-btn"
                                  disabled={hostBusy}
                                  onClick={() => confirmDeleteHost(h)}
                                >
                                  {hostBusy ? (
                                    <Loader2 size={14} className="spin-icon" />
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
                                  <span>Konfirmasi Hapus</span>
                                </button>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  onClick={() => setConfirmDeleteHostId(null)}
                                >
                                  Batal
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="host-progress-block">
                          <div className="host-progress-label">
                            <span>Tingkat Kehadiran Aktif</span>
                            <strong className="tabular-nums">
                              {Math.round(ratio * 100)}% ({worked}/{mine.length} hari)
                            </strong>
                          </div>
                          <div className="host-progress-track">
                            <motion.div
                              className="host-progress-fill"
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: ratio }}
                              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                            />
                          </div>
                        </div>

                        <div className="host-metric-row">
                          <div>
                            <small>Full</small>
                            <strong className="tabular-nums">{fullCount}</strong>
                          </div>
                          <div>
                            <small>4 Jam</small>
                            <strong className="tabular-nums">{fourCount}</strong>
                          </div>
                          <div>
                            <small>Libur</small>
                            <strong className="tabular-nums">{holidayCount}</strong>
                          </div>
                          <div>
                            <small>Sakit</small>
                            <strong className="tabular-nums">{sickCount}</strong>
                          </div>
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attendance Log Panel */}
        <section className="panel records-panel">
          <div className="records-head">
            <div>
              <p className="panel-kicker">Log Kehadiran</p>
              <h3>Riwayat Absensi</h3>
            </div>
            <div className="records-head-actions">
              {hasActiveFilters && (
                <button
                  type="button"
                  className="reset-filter-btn"
                  onClick={resetFilters}
                >
                  <RotateCcw size={14} />
                  <span>Reset</span>
                </button>
              )}
              <button
                type="button"
                className="icon-btn"
                onClick={() => load(true)}
                title="Muat ulang"
              >
                <RefreshCw size={16} className={refreshing ? "spin-icon" : ""} />
              </button>
            </div>
          </div>

          <div className="filters">
            <label className="search-box">
              <Search size={15} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari host, tanggal, atau catatan..."
              />
            </label>
            <input
              className="month-filter"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              aria-label="Pilih bulan"
            />
            <select value={host} onChange={(e) => setHost(e.target.value)}>
              <option value="Semua">Semua Host</option>
              {filterHostOptions.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Semua">Semua Status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Host</th>
                  <th>Status</th>
                  <th>Catatan</th>
                  {isAdmin && <th className="th-right">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skel-${i}`} className="skeleton-row">
                      <td>
                        <div className="skel skel-cell-sm" />
                      </td>
                      <td>
                        <div className="skel skel-cell-xs" />
                      </td>
                      <td>
                        <div className="skel skel-badge" />
                      </td>
                      <td>
                        <div className="skel skel-cell-lg" />
                      </td>
                      {isAdmin && (
                        <td>
                          <div className="skel skel-cell-xs" />
                        </td>
                      )}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="empty">
                      Belum ada data absensi untuk filter atau periode ini.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id}>
                      <td className="tabular-nums">
                        {new Date(`${r.attendance_date}T00:00:00`).toLocaleDateString(
                          "id-ID",
                          { day: "2-digit", month: "short", year: "numeric" }
                        )}
                      </td>
                      <td>
                        <b>{r.host}</b>
                      </td>
                      <td>
                        <span className={`status-badge ${r.status}`}>
                          {STATUS_LABELS[r.status]}
                        </span>
                      </td>
                      <td className="note-cell">{r.note || "—"}</td>
                      {isAdmin && (
                        <td className="td-right">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => startEdit(r)}
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="records-foot">
            <span className="tabular-nums">
              {filtered.length} catatan ditampilkan
              {selectedDay ? ` · Tanggal ${selectedDay}` : ""}
            </span>
            <div className="pdf-actions">
              {hosts.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => handleExport(h.name)}
                  disabled={exportingTarget !== null}
                >
                  {exportingTarget === h.name ? (
                    <Loader2 size={14} className="spin-icon" />
                  ) : (
                    <Download size={14} />
                  )}
                  <span>PDF {h.name}</span>
                </button>
              ))}
              <button
                type="button"
                className="pdf-primary"
                onClick={() => handleExport("Semua")}
                disabled={exportingTarget !== null}
              >
                {exportingTarget === "Semua" ? (
                  <Loader2 size={14} className="spin-icon" />
                ) : (
                  <Download size={14} />
                )}
                <span>PDF Gabungan</span>
              </button>
            </div>
          </div>
        </section>

        <footer className="app-footer">
          <div className="footer-brand">
            {!logoFailed && (
              <img
                src="/redbox-logo.png"
                alt="REDBOX"
                referrerPolicy="no-referrer"
              />
            )}
            <span>
              REDBOX <small>Live Attendance</small>
            </span>
          </div>
          <span className="footer-tagline">
            Sistem Manajemen Kehadiran Host Studio
          </span>
          <strong>
            © {new Date().getFullYear()} <em>Nauell Tech.</em> All rights reserved.
          </strong>
        </footer>
      </section>

      {/* Public Profile Photo Request Modal */}
      <AnimatePresence>
        {photoModalHost && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !photoBusy && setPhotoModalHost(null)}
          >
            <motion.div
              className="modal-card"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="photo-modal-title"
            >
              <div className="modal-head">
                <div>
                  <p className="panel-kicker">Foto Profil Host</p>
                  <h3 id="photo-modal-title">Ganti Foto · {photoModalHost.name}</h3>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setPhotoModalHost(null)}
                  aria-label="Tutup modal"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="muted modal-desc">
                {isAdmin
                  ? "Anda masuk sebagai Admin. Anda dapat mengajukan untuk persetujuan atau langsung menerapkan foto baru."
                  : "Siapa saja dapat mengajukan foto baru tanpa harus login. Foto baru akan tampil setelah disetujui Admin."}
              </p>

              <div className="modal-preview-strip">
                <div className="modal-preview-slot">
                  <small>Saat Ini</small>
                  <HostAvatar
                    name={photoModalHost.name}
                    avatarUrl={photoModalHost.avatar_url}
                    size="lg"
                  />
                </div>
                <span className="approval-arrow" aria-hidden="true">
                  →
                </span>
                <div className="modal-preview-slot">
                  <small>Usulan Baru</small>
                  <HostAvatar
                    name={photoModalHost.name}
                    avatarUrl={photoPreviewUrl || null}
                    size="lg"
                  />
                </div>
              </div>

              <form onSubmit={(e) => submitPhotoRequest(e, false)} className="entry-form">
                <label className="upload-dropzone">
                  <ImagePlus size={18} />
                  <span>Pilih file foto dari perangkat (JPG, PNG, WebP)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoFileChange}
                  />
                </label>

                <label>
                  Atau masukkan URL foto <span className="optional">(opsional)</span>
                  <input
                    type="url"
                    value={photoUrlInput}
                    onChange={(e) => handleUrlInputChange(e.target.value)}
                    placeholder="https://contoh.com/foto-host.jpg"
                  />
                </label>

                <label>
                  Nama pengaju / catatan <span className="optional">(opsional)</span>
                  <input
                    type="text"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder={`Mis. ${photoModalHost.name} - foto studio terbaru`}
                    maxLength={60}
                  />
                </label>

                {photoError && <p className="entry-error">{photoError}</p>}

                <div className="modal-actions">
                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={photoBusy || !photoPreviewUrl}
                  >
                    {photoBusy ? (
                      <Loader2 size={16} className="spin-icon" />
                    ) : (
                      <Camera size={16} />
                    )}
                    <span>Ajukan Ganti Foto</span>
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      className="approve-btn"
                      disabled={photoBusy || !photoPreviewUrl}
                      onClick={(e) => submitPhotoRequest(e, true)}
                    >
                      <Check size={15} />
                      <span>Terapkan Langsung</span>
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
  loading,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: string;
  loading: boolean;
  delay: number;
}) {
  return (
    <motion.div
      className={`stat-card ${tone}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
    >
      <div className="stat-top">
        <span className="stat-icon-box">{icon}</span>
        <span>{label}</span>
      </div>
      <strong>
        {loading ? (
          <span className="skel skel-stat" />
        ) : (
          <AnimatedNumber value={value} />
        )}
      </strong>
      <small>Hari tercatat bulan ini</small>
    </motion.div>
  );
}
=======
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




>>>>>>> 335cafa28b6e8524310779a6d02437148a1f79ca
