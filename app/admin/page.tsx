"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signOut as firebaseSignOut } from "firebase/auth";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
  onSnapshot, query, orderBy, writeBatch, getDocs, where, setDoc
} from "firebase/firestore";

// ─── Types ────────────────────────────────────────────────────────────────────
type QuestionType = "SHORT" | "PARAGRAPH" | "MCQ" | "CHECKBOX" | "DROPDOWN" | "EMAIL" | "PHONE" | "DATE";
interface FormQuestion {
  id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options?: string[]; // for MCQ / CHECKBOX / DROPDOWN
}
interface FormSchema {
  id?: string;
  title: string;
  description: string;
  eventId: string;
  questions: FormQuestion[];
  createdAt?: any;
}
interface Registration {
  id?: string;
  formId: string;
  eventId: string;
  eventTitle?: string;
  userEmail: string;
  userName?: string;
  responses: Record<string, any>;
  attendanceStatus: "REGISTERED" | "PRESENT" | "ABSENT";
  certificateIssued?: boolean;
  submittedAt: string;
}

// ─── Smart name extractor ─────────────────────────────────────────────────────
// Scans all form response keys/values to find the most likely "name" field.
// Works regardless of how the admin labeled the question.
const NAME_KEYWORDS = ["name", "fullname", "full_name", "yourname", "participant", "studentname", "attendee", "naam"];

const extractName = (reg: Registration): string => {
  // 1. Prefer explicit top-level userName
  if (reg.userName && reg.userName.trim()) return reg.userName.trim();

  const responses = reg.responses || {};

  // 2. Check if any response KEY fuzzy-matches a name keyword
  const keyMatch = Object.entries(responses).find(([key]) => {
    const normalized = key.toLowerCase().replace(/[\s_\-]/g, "");
    return NAME_KEYWORDS.some(kw => normalized.includes(kw));
  });
  if (keyMatch && typeof keyMatch[1] === "string" && keyMatch[1].trim()) return keyMatch[1].trim();

  // 3. Fallback — find first value that looks like a human name:
  //    - Is a non-empty string
  //    - Not an email (no @)
  //    - Not a URL
  //    - Not purely numeric
  //    - Between 2 and 60 chars
  const nameLike = Object.values(responses).find(
    v => typeof v === "string" && v.trim().length >= 2 && v.trim().length <= 60
      && !v.includes("@") && !v.startsWith("http") && !/^\d+$/.test(v.trim())
  );
  if (nameLike) return (nameLike as string).trim();

  // 4. Last resort
  return reg.userEmail?.split("@")[0] || "Participant";
};

// ─── Cyber CSS ─────────────────────────────────────────────────────────────────
const cyberStyles = `
  input[type="date"]::-webkit-calendar-picker-indicator,
  input[type="time"]::-webkit-calendar-picker-indicator {
    filter: invert(72%) sepia(95%) saturate(1000%) hue-rotate(155deg) brightness(100%) contrast(105%) !important;
    cursor: pointer !important; opacity: 1 !important;
  }
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #00d2ff33; border-radius: 10px; }
  input, select, textarea, button, a { cursor: pointer !important; }
  input[type="text"], input[type="number"], input[type="email"], input[type="tel"], textarea { cursor: text !important; }
  @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .fade-in { animation: fadeSlideIn 0.25s ease forwards; }
  @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
  .blink { animation: blink 1.4s infinite; }
`;

const adminInputClass =
  "bg-black/60 border border-white/10 rounded-xl p-3 md:p-4 text-xs outline-none focus:border-[#00d2ff] w-full transition-all text-white font-mono";

const uid = () => Math.random().toString(36).slice(2, 9);

// ─── Upload to Cloudinary ──────────────────────────────────────────────────────
const uploadToCloudinary = async (fileToUpload: File) => {
  const formData = new FormData();
  formData.append("file", fileToUpload);
  formData.append("upload_preset", "ml_default");
  const res = await fetch(`https://api.cloudinary.com/v1_1/dbzezvhhq/image/upload`, { method: "POST", body: formData });
  const data = await res.json();
  return data.secure_url;
};

// ─── Question type labels ──────────────────────────────────────────────────────
const Q_TYPES: { value: QuestionType; label: string; icon: string }[] = [
  { value: "SHORT", label: "Short Answer", icon: "—" },
  { value: "PARAGRAPH", label: "Paragraph", icon: "¶" },
  { value: "EMAIL", label: "Email", icon: "@" },
  { value: "PHONE", label: "Phone", icon: "#" },
  { value: "DATE", label: "Date", icon: "📅" },
  { value: "MCQ", label: "Multiple Choice", icon: "◉" },
  { value: "CHECKBOX", label: "Checkboxes", icon: "☑" },
  { value: "DROPDOWN", label: "Dropdown", icon: "▾" },
];

// ════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const { data: session } = useSession();

  // ── active panel: null | EVENT | MEMBER | FORM_BUILDER | CERT_DESIGN | ATTENDANCE
  const [activeModal, setActiveModal] = useState<"EVENT" | "MEMBER" | "FORM_BUILDER" | "CERT_DESIGN" | "ATTENDANCE" | null>(null);
  const [activeSub, setActiveSub] = useState<string | null>(null); // for attendance: eventId filter

  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [forms, setForms] = useState<FormSchema[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const adminDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(e.target as Node)) {
        setAdminDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Event / Member form state
  const [newEvent, setNewEvent] = useState({
    title: "", date: "", startTime: "", endDate: "", endTime: "", venue: "", category: "Workshop", description: ""
  });

  // Attendance bulk selection
  const [selectedRegIds, setSelectedRegIds] = useState<Set<string>>(new Set());
  const [newMember, setNewMember] = useState({
    name: "", role: "", section: "Student", linkedin: "", hierarchy: 1, collegeId: ""
  });

  // Form Builder state
  const [formSchema, setFormSchema] = useState<FormSchema>({
    title: "", description: "", eventId: "", questions: []
  });
  const [editingFormId, setEditingFormId] = useState<string | null>(null);

  // Cert Design state
  const [certDesign, setCertDesign] = useState({ eventId: "", templateUrl: "", nameX: 50, nameY: 50, fontSize: 48, fontColor: "#ffffff" });
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPreview, setCertPreview] = useState<string | null>(null);

  // Attendance filter
  const [attendanceEventId, setAttendanceEventId] = useState("");

  // ── Firestore listeners ────────────────────────────────────────────
  useEffect(() => {
    const qE = query(collection(db, "events"), orderBy("timestamp", "desc"));
    const unE = onSnapshot(qE, s => setEvents(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qT = query(collection(db, "team"), orderBy("hierarchy", "asc"));
    const unT = onSnapshot(qT, s => setTeamMembers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qF = query(collection(db, "forms"), orderBy("createdAt", "desc"));
    const unF = onSnapshot(qF, s => setForms(s.docs.map(d => ({ id: d.id, ...d.data() } as FormSchema))));
    const qR = query(collection(db, "registrations"), orderBy("submittedAt", "desc"));
    const unR = onSnapshot(qR, s => setRegistrations(s.docs.map(d => ({ id: d.id, ...d.data() } as Registration))));
    return () => { unE(); unT(); unF(); unR(); };
  }, []);

  const emailPrefix = session?.user?.email?.split("@")[0] || "ADMIN";
  const avatarSrc = (!avatarError && session?.user?.image)
    ? session.user.image
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(emailPrefix)}&background=0f111a&color=00d2ff&bold=true&size=64`;

  // ── Logout ─────────────────────────────────────────────────────────
  const handleAdminLogout = async () => {
    if (confirm("TERMINATE_ADMIN_SESSION?")) {
      await firebaseSignOut(auth);
      await nextAuthSignOut({ redirect: false });
      window.location.href = "/?bye=1";
    }
  };

  // ── Event / Member submit ──────────────────────────────────────────
  const handleEventDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !editingId) return alert("MISSING_POSTER");
    setLoading(true);
    try {
      let posterUrl = previewUrl;
      if (file) posterUrl = await uploadToCloudinary(file);
      const autoCountdownTarget = `${newEvent.date}T${newEvent.startTime || "00:00"}`;
      const certPublishAt = newEvent.endDate
        ? `${newEvent.endDate}T${newEvent.endTime || "23:59"}`
        : autoCountdownTarget;
      if (editingId) {
        await updateDoc(doc(db, "events", editingId), { ...newEvent, countdownTarget: autoCountdownTarget, certPublishAt, posterUrl, category: newEvent.category.toLowerCase() });
        alert("MISSION_UPDATED");
      } else {
        await addDoc(collection(db, "events"), { ...newEvent, countdownTarget: autoCountdownTarget, certPublishAt, posterUrl, category: newEvent.category.toLowerCase(), timestamp: serverTimestamp() });
        alert("MISSION_SUCCESS");
      }
      closeModal();
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleMemberDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !editingId) return alert("MISSING_PHOTO");
    setLoading(true);
    try {
      let photoUrl = previewUrl;
      if (file) photoUrl = await uploadToCloudinary(file);
      if (editingId) {
        await updateDoc(doc(db, "team", editingId), { ...newMember, image: photoUrl });
        alert("OPERATIVE_UPDATED");
      } else {
        await addDoc(collection(db, "team"), { ...newMember, image: photoUrl, timestamp: serverTimestamp() });
        alert("MEMBER_RECRUITED");
      }
      closeModal();
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  // ── Form Builder ────────────────────────────────────────────────────
  const addQuestion = (type: QuestionType) => {
    const q: FormQuestion = {
      id: uid(), type, label: "", required: false,
      options: ["MCQ","CHECKBOX","DROPDOWN"].includes(type) ? ["Option 1"] : undefined
    };
    setFormSchema(f => ({ ...f, questions: [...f.questions, q] }));
  };

  const updateQuestion = (id: string, patch: Partial<FormQuestion>) => {
    setFormSchema(f => ({ ...f, questions: f.questions.map(q => q.id === id ? { ...q, ...patch } : q) }));
  };

  const removeQuestion = (id: string) => {
    setFormSchema(f => ({ ...f, questions: f.questions.filter(q => q.id !== id) }));
  };

  const addOption = (qId: string) => {
    setFormSchema(f => ({
      ...f,
      questions: f.questions.map(q =>
        q.id === qId ? { ...q, options: [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`] } : q
      )
    }));
  };

  const updateOption = (qId: string, idx: number, val: string) => {
    setFormSchema(f => ({
      ...f,
      questions: f.questions.map(q =>
        q.id === qId ? { ...q, options: q.options?.map((o, i) => i === idx ? val : o) } : q
      )
    }));
  };

  const removeOption = (qId: string, idx: number) => {
    setFormSchema(f => ({
      ...f,
      questions: f.questions.map(q =>
        q.id === qId ? { ...q, options: q.options?.filter((_, i) => i !== idx) } : q
      )
    }));
  };

  const handleFormSave = async () => {
    if (!formSchema.title || !formSchema.eventId) return alert("TITLE_AND_EVENT_REQUIRED");
    if (formSchema.questions.length === 0) return alert("ADD_AT_LEAST_ONE_QUESTION");
    setLoading(true);
    try {
      const payload = { ...formSchema, createdAt: serverTimestamp() };
      if (editingFormId) {
        await updateDoc(doc(db, "forms", editingFormId), payload);
        alert("FORM_UPDATED");
      } else {
        await addDoc(collection(db, "forms"), payload);
        alert("FORM_DEPLOYED");
      }
      closeModal();
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const openEditForm = (form: FormSchema) => {
    setEditingFormId(form.id || null);
    setFormSchema({ title: form.title, description: form.description, eventId: form.eventId, questions: form.questions });
    setActiveModal("FORM_BUILDER");
  };

  // ── Certificate Design ──────────────────────────────────────────────
  const handleCertDesignSave = async () => {
    if (!certDesign.eventId) return alert("SELECT_EVENT");
    setLoading(true);
    try {
      let templateUrl = certDesign.templateUrl;
      if (certFile) templateUrl = await uploadToCloudinary(certFile);
      if (!templateUrl) return alert("UPLOAD_CERTIFICATE_TEMPLATE");
      
      const event = events.find(e => e.id === certDesign.eventId);
      const eventRegs = registrations.filter(r => r.eventId === certDesign.eventId && r.attendanceStatus === "PRESENT");
      
      const batch = writeBatch(db);
      eventRegs.forEach(reg => {
        const certRef = doc(collection(db, "certificates"));
        batch.set(certRef, {
          userEmail: reg.userEmail,
          userName: extractName(reg),
          eventId: certDesign.eventId,
          eventTitle: event?.title || "Event",
          templateUrl,
          nameX: certDesign.nameX,
          nameY: certDesign.nameY,
          fontSize: certDesign.fontSize,
          fontColor: certDesign.fontColor,
          issueDate: new Date().toLocaleDateString(),
          certHash: Math.random().toString(36).substring(7).toUpperCase(),
          timestamp: serverTimestamp()
        });
        // Mark registration as cert issued
        if (reg.id) {
          const regRef = doc(db, "registrations", reg.id);
          batch.update(regRef, { certificateIssued: true });
        }
      });
      await batch.commit();
      alert(`CERTIFICATES_ISSUED: ${eventRegs.length} operatives`);
      closeModal();
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  // ── Attendance ──────────────────────────────────────────────────────
  const updateAttendance = async (regId: string, status: "PRESENT" | "ABSENT" | "REGISTERED") => {
    await updateDoc(doc(db, "registrations", regId), { attendanceStatus: status });
  };

  const toggleSelect = (id: string) => {
    setSelectedRegIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const markAllPresent = async () => {
    if (!confirm(`MARK ALL ${filteredRegs.length} AS PRESENT?`)) return;
    const batch = writeBatch(db);
    filteredRegs.forEach(r => { if (r.id) batch.update(doc(db, "registrations", r.id), { attendanceStatus: "PRESENT" }); });
    await batch.commit();
  };

  const bulkMark = async (status: "PRESENT" | "ABSENT" | "REGISTERED") => {
    if (selectedRegIds.size === 0) return;
    const batch = writeBatch(db);
    selectedRegIds.forEach(id => batch.update(doc(db, "registrations", id), { attendanceStatus: status }));
    await batch.commit();
    setSelectedRegIds(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedRegIds.size === filteredRegs.length) {
      setSelectedRegIds(new Set());
    } else {
      setSelectedRegIds(new Set(filteredRegs.map(r => r.id!).filter(Boolean)));
    }
  };

  const deleteRegistration = async (regId: string) => {
    if (confirm("REMOVE_REGISTRATION?")) await deleteDoc(doc(db, "registrations", regId));
  };

  const filteredRegs = attendanceEventId
    ? registrations.filter(r => r.eventId === attendanceEventId)
    : registrations;

  // ── Edit helpers ─────────────────────────────────────────────────────
  const openEditModal = (item: any, type: "EVENT" | "MEMBER") => {
    setEditingId(item.id);
    setActiveModal(type);
    if (type === "EVENT") {
      setNewEvent({ title: item.title, date: item.date, startTime: item.startTime || "", endDate: item.endDate || "", endTime: item.endTime || "", venue: item.venue, category: item.category, description: item.description });
      setPreviewUrl(item.posterUrl);
    } else {
      setNewMember({ name: item.name, role: item.role, section: item.section, linkedin: item.linkedin, hierarchy: item.hierarchy, collegeId: item.collegeId || "" });
      setPreviewUrl(item.image);
    }
  };

  const closeModal = () => {
    setActiveModal(null); setFile(null); setPreviewUrl(null); setEditingId(null);
    setEditingFormId(null); setCertFile(null); setCertPreview(null);
    setNewEvent({ title: "", date: "", startTime: "", endDate: "", endTime: "", venue: "", category: "Workshop", description: "" });
    setNewMember({ name: "", role: "", section: "Student", linkedin: "", hierarchy: 1, collegeId: "" });
    setFormSchema({ title: "", description: "", eventId: "", questions: [] });
    setCertDesign({ eventId: "", templateUrl: "", nameX: 50, nameY: 50, fontSize: 48, fontColor: "#ffffff" });
    setAttendanceEventId("");
    setSelectedRegIds(new Set());
  };

  const presentCount = filteredRegs.filter(r => r.attendanceStatus === "PRESENT").length;
  const absentCount = filteredRegs.filter(r => r.attendanceStatus === "ABSENT").length;

  return (
    <div style={{ position: "relative", zIndex: 10005, backgroundColor: "#05060a", minHeight: "100vh", pointerEvents: "auto" }}>
      <style>{cyberStyles}</style>

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 w-full h-14 bg-[#0f111a] border-b border-[#2a2e3f] flex items-center justify-between px-4 md:px-6 z-[10006]">
        <div className="flex items-center gap-2">
          <Image src="/CFC.png" alt="CFC" width={26} height={26} />
          <div style={{ color: "#fff", fontWeight: 900, fontSize: "13px", letterSpacing: "0.5px" }}>
            <span className="hidden sm:inline">CODE_FOR_CAUSE </span>
            <span className="sm:hidden">CFC </span>
            <span style={{ color: "#00d2ff", opacity: 0.6 }}>$root</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* ── ADMIN DROPDOWN ──────────────────────────────── */}
          <div ref={adminDropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setAdminDropdownOpen(o => !o)}
              className="flex items-center gap-2 bg-black/50 pr-3 p-1 rounded-full border border-white/10 hover:border-[#00d2ff]/40 transition-all"
            >
              <img
                src={avatarSrc}
                alt="Admin"
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-7 h-7 rounded-full border border-[#00d2ff] object-cover"
              />
              <span className="hidden sm:inline text-[10px] text-gray-400 font-bold uppercase tracking-widest">{emailPrefix}</span>
              <span className="text-[#00d2ff] text-[10px]">{adminDropdownOpen ? "▴" : "▾"}</span>
            </button>

            {adminDropdownOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 10px)", right: 0,
                backgroundColor: "#0f111a",
                border: "1px solid rgba(0,210,255,0.2)",
                borderRadius: "12px",
                minWidth: "180px",
                boxShadow: "0 16px 40px rgba(0,0,0,0.8)",
                overflow: "hidden",
                zIndex: 20010,
                animation: "fadeSlideIn 0.15s ease forwards",
              }}>
                {/* User info */}
                <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ fontSize: "11px", fontWeight: 900, color: "#fff", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{emailPrefix}</p>
                  <p style={{ fontSize: "9px", color: "#ffb86c", margin: "2px 0 0", textTransform: "uppercase" }}>SUPER_ADMIN</p>
                </div>

                {/* Home */}
                <Link href="/" onClick={() => setAdminDropdownOpen(false)} style={{ textDecoration: "none" }}>
                  <div style={adminDropdownItem("#00d2ff")}>
                    <span>🏠</span><span>Home</span>
                  </div>
                </Link>

                {/* Dashboard */}
                <Link href="/dashboard" onClick={() => setAdminDropdownOpen(false)} style={{ textDecoration: "none" }}>
                  <div style={adminDropdownItem("#50fa7b")}>
                    <span>⌘</span><span>Dashboard</span>
                  </div>
                </Link>

                {/* Divider */}
                <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "4px 0" }} />

                {/* Logout */}
                <button onClick={() => { setAdminDropdownOpen(false); handleAdminLogout(); }} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <div style={adminDropdownItem("#ff5555")}>
                    <span>⏻</span><span>Root Exit</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN ────────────────────────────────────────────────────── */}
      <main className="min-h-screen pt-20 md:pt-24 px-4 md:px-8 font-mono text-white selection:bg-[#50fa7b] selection:text-black">
        <div className="max-w-7xl mx-auto">

          <div className="mb-8 md:mb-10 border-l-4 border-[#50fa7b] pl-4">
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white">
              Command <span className="text-[#50fa7b]">Center</span>
            </h1>
            <p className="text-gray-500 text-[10px] mt-1 uppercase tracking-widest break-all">
              {session?.user?.email || "ID: SUPER_ADMIN"}
            </p>
          </div>

          {/* ── QUICK ACTIONS ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-10 md:mb-16">
            <ActionCard label="Deploy Event" sub="Mission Registry" color="#00d2ff" onClick={() => setActiveModal("EVENT")} />
            <ActionCard label="Recruit Member" sub="Personnel Registry" color="#50fa7b" onClick={() => setActiveModal("MEMBER")} />
            <ActionCard label="Form Builder" sub="Registration Forms" color="#bd93f9" onClick={() => setActiveModal("FORM_BUILDER")} />
            <ActionCard label="Cert Designer" sub="Certificate Distribution" color="#ffb86c" onClick={() => setActiveModal("CERT_DESIGN")} />
          </div>

          {/* ── ATTENDANCE PANEL (always visible) ────────────────── */}
          <div className="mb-10">
            <div className="bg-[#0a0c10] border border-[#bd93f9]/20 rounded-2xl md:rounded-3xl p-4 md:p-6 font-mono">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h3 className="text-xs font-bold uppercase tracking-[0.3em] flex items-center gap-2 text-[#bd93f9]">
                  <span className="w-2 h-2 rounded-full animate-pulse bg-[#bd93f9]" />
                  Attendance_Registry
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] text-[#50fa7b] uppercase font-bold">{presentCount} PRESENT</span>
                  <span className="text-[9px] text-[#ff5555] uppercase font-bold">{absentCount} ABSENT</span>
                  <select
                    className="bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white outline-none focus:border-[#bd93f9]"
                    value={attendanceEventId}
                    onChange={e => { setAttendanceEventId(e.target.value); setSelectedRegIds(new Set()); }}
                  >
                    <option value="">ALL_EVENTS</option>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                  </select>
                  <button
                    onClick={markAllPresent}
                    className="text-[9px] font-black uppercase px-3 py-1.5 rounded-lg bg-[#50fa7b]/10 border border-[#50fa7b]/30 text-[#50fa7b] hover:bg-[#50fa7b] hover:text-black transition-all"
                  >✓ ALL PRESENT</button>
                </div>
              </div>

              {/* Bulk action bar — appears when rows are selected */}
              {selectedRegIds.size > 0 && (
                <div className="flex items-center gap-2 mb-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2 fade-in">
                  <span className="text-[9px] text-[#bd93f9] font-black uppercase mr-2">{selectedRegIds.size} SELECTED</span>
                  {(["PRESENT","ABSENT","REGISTERED"] as const).map(s => (
                    <button key={s} onClick={() => bulkMark(s)}
                      className={`text-[8px] font-black uppercase px-3 py-1.5 rounded-lg transition-all ${
                        s === "PRESENT" ? "bg-[#50fa7b]/20 text-[#50fa7b] hover:bg-[#50fa7b] hover:text-black"
                        : s === "ABSENT" ? "bg-[#ff5555]/20 text-[#ff5555] hover:bg-[#ff5555] hover:text-black"
                        : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >→ {s}</button>
                  ))}
                  <button onClick={() => setSelectedRegIds(new Set())} className="ml-auto text-[8px] text-gray-500 hover:text-white uppercase font-bold">Clear</button>
                </div>
              )}

              {filteredRegs.length === 0 ? (
                <div className="text-center py-10 text-gray-600 text-[10px] uppercase tracking-widest">NO_REGISTRATIONS_FOUND</div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                  {/* Select all row */}
                  <div className="flex items-center gap-2 px-1 mb-1">
                    <div
                      onClick={toggleSelectAll}
                      className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                        selectedRegIds.size === filteredRegs.length && filteredRegs.length > 0
                          ? "bg-[#bd93f9] border-[#bd93f9]" : "border-white/20 hover:border-[#bd93f9]"
                      }`}
                    >
                      {selectedRegIds.size === filteredRegs.length && filteredRegs.length > 0 && (
                        <span className="text-black text-[8px] font-black">✓</span>
                      )}
                    </div>
                    <span className="text-[8px] text-gray-600 uppercase font-bold tracking-widest">Select All</span>
                  </div>

                  {filteredRegs.map(reg => {
                    const ev = events.find(e => e.id === reg.eventId);
                    const name = extractName(reg);
                    const isSelected = reg.id ? selectedRegIds.has(reg.id) : false;
                    return (
                      <div key={reg.id} className={`grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_2fr_2fr_1fr_auto] gap-2 items-center p-3 rounded-xl border transition-all fade-in ${
                        isSelected ? "bg-[#bd93f9]/10 border-[#bd93f9]/30" : "bg-white/5 border-white/5 hover:border-white/15"
                      }`}>
                        {/* Checkbox */}
                        <div
                          onClick={() => reg.id && toggleSelect(reg.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                            isSelected ? "bg-[#bd93f9] border-[#bd93f9]" : "border-white/20 hover:border-[#bd93f9]"
                          }`}
                        >
                          {isSelected && <span className="text-black text-[8px] font-black">✓</span>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase text-white truncate">{name}</p>
                          <p className="text-[9px] text-gray-500 truncate">{reg.userEmail}</p>
                        </div>
                        <div className="hidden md:block min-w-0">
                          <p className="text-[9px] text-[#bd93f9] truncate uppercase">{ev?.title || reg.eventId}</p>
                        </div>
                        <div className="hidden md:flex items-center gap-1">
                          {(["REGISTERED","PRESENT","ABSENT"] as const).map(s => (
                            <button key={s} onClick={() => reg.id && updateAttendance(reg.id, s)}
                              className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg transition-all ${
                                reg.attendanceStatus === s
                                  ? s === "PRESENT" ? "bg-[#50fa7b] text-black" : s === "ABSENT" ? "bg-[#ff5555] text-black" : "bg-white/20 text-white"
                                  : "bg-white/5 text-gray-500 hover:text-white"
                              }`}
                            >{s}</button>
                          ))}
                        </div>
                        <button onClick={() => reg.id && deleteRegistration(reg.id)} className="text-[#ff5555] text-[10px] font-bold uppercase opacity-30 hover:opacity-100 transition-opacity">Del</button>
                        {/* Mobile status */}
                        <div className="md:hidden col-span-3 flex gap-1 mt-1">
                          {(["REGISTERED","PRESENT","ABSENT"] as const).map(s => (
                            <button key={s} onClick={() => reg.id && updateAttendance(reg.id, s)}
                              className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg transition-all flex-1 ${
                                reg.attendanceStatus === s
                                  ? s === "PRESENT" ? "bg-[#50fa7b] text-black" : s === "ABSENT" ? "bg-[#ff5555] text-black" : "bg-white/20 text-white"
                                  : "bg-white/5 text-gray-500 hover:text-white"
                              }`}
                            >{s}</button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── REGISTRY LISTS ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 pb-12">
            <RegistryList title="Mission_Registry" items={events} onEdit={(item: any) => openEditModal(item, "EVENT")} onDel={(id: string) => deleteDoc(doc(db, "events", id))} color="#00d2ff" type="event" />
            <RegistryList title="Personnel_Registry" items={teamMembers} onEdit={(item: any) => openEditModal(item, "MEMBER")} onDel={(id: string) => deleteDoc(doc(db, "team", id))} color="#50fa7b" type="member" />
            {/* Forms list */}
            <div className="bg-[#0a0c10] border border-white/5 rounded-2xl md:rounded-3xl p-4 md:p-6 font-mono">
              <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-4 md:mb-6 flex items-center gap-2 text-[#bd93f9]">
                <span className="w-2 h-2 rounded-full animate-pulse bg-[#bd93f9]" />
                Form_Registry
              </h3>
              <div className="space-y-3 max-h-72 md:max-h-80 overflow-y-auto pr-1 md:pr-2 custom-scrollbar">
                {forms.map(form => {
                  const ev = events.find(e => e.id === form.eventId);
                  return (
                    <div key={form.id} className="flex justify-between items-center bg-white/5 p-3 md:p-4 rounded-xl border border-white/5 group hover:border-white/20 transition-all gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold uppercase tracking-wider truncate text-white">{form.title}</h4>
                        <p className="text-[9px] text-gray-500 uppercase truncate">{ev?.title || form.eventId}</p>
                        <p className="text-[8px] text-[#bd93f9]">{form.questions.length} questions</p>
                      </div>
                      <div className="flex gap-3 shrink-0">
                        <button onClick={() => openEditForm(form)} className="text-[#bd93f9] text-[10px] font-bold uppercase opacity-50 hover:opacity-100 transition-opacity">Edit</button>
                        <button onClick={() => confirm("DELETE_FORM?") && form.id && deleteDoc(doc(db, "forms", form.id))} className="text-[#ff5555] text-[10px] font-bold uppercase opacity-30 hover:opacity-100 transition-opacity">Del</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            FORM BUILDER MODAL
        ════════════════════════════════════════════════════════════ */}
        {activeModal === "FORM_BUILDER" && (
          <div className="fixed inset-0 z-[20000] flex items-start justify-center bg-black/95 backdrop-blur-md p-3 md:p-4 overflow-y-auto">
            <div className="bg-[#0B111A] border border-[#bd93f9]/40 w-full max-w-3xl rounded-2xl md:rounded-3xl p-6 md:p-10 shadow-2xl my-4">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-black tracking-[0.2em] text-[10px] md:text-xs uppercase text-[#bd93f9]">
                  [ {editingFormId ? "UPDATE_FORM" : "INIT_FORM_BUILDER"} ]
                </h2>
                <button onClick={closeModal} className="text-gray-500 hover:text-white text-lg">✕</button>
              </div>

              <div className="space-y-4">
                {/* Form meta */}
                <input placeholder="FORM_TITLE *" value={formSchema.title} onChange={e => setFormSchema(f => ({ ...f, title: e.target.value }))} className={adminInputClass} />
                <input placeholder="Description (optional)" value={formSchema.description} onChange={e => setFormSchema(f => ({ ...f, description: e.target.value }))} className={adminInputClass} />
                <select required className={adminInputClass} value={formSchema.eventId} onChange={e => setFormSchema(f => ({ ...f, eventId: e.target.value }))}>
                  <option value="">LINK_TO_EVENT *</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>

                <div className="h-px bg-white/5 my-2" />

                {/* Questions */}
                <div className="space-y-3">
                  {formSchema.questions.map((q, qi) => (
                    <div key={q.id} className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3 fade-in">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] text-[#bd93f9] font-black uppercase tracking-widest">Q{qi + 1} · {q.type}</span>
                        <button onClick={() => removeQuestion(q.id)} className="text-[#ff5555] text-[10px] font-bold opacity-50 hover:opacity-100">✕ Remove</button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-center">
                        <input
                          placeholder="Question label *"
                          value={q.label}
                          onChange={e => updateQuestion(q.id, { label: e.target.value })}
                          className={adminInputClass}
                        />
                        <select
                          value={q.type}
                          onChange={e => updateQuestion(q.id, { type: e.target.value as QuestionType })}
                          className="bg-black/60 border border-white/10 rounded-xl px-3 py-3 text-[10px] text-white outline-none focus:border-[#bd93f9] font-mono"
                        >
                          {Q_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                          <div
                            onClick={() => updateQuestion(q.id, { required: !q.required })}
                            className={`w-9 h-5 rounded-full transition-all relative ${q.required ? "bg-[#bd93f9]" : "bg-white/10"}`}
                          >
                            <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all ${q.required ? "left-[18px]" : "left-1"}`} />
                          </div>
                          <span className="text-[9px] text-gray-400 uppercase font-bold">Required</span>
                        </label>
                      </div>

                      {/* Options for MCQ/Checkbox/Dropdown */}
                      {(q.type === "MCQ" || q.type === "CHECKBOX" || q.type === "DROPDOWN") && (
                        <div className="space-y-2 pl-2">
                          {q.options?.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-600 w-4 shrink-0">
                                {q.type === "MCQ" ? "○" : q.type === "CHECKBOX" ? "☐" : `${oi + 1}.`}
                              </span>
                              <input
                                value={opt}
                                onChange={e => updateOption(q.id, oi, e.target.value)}
                                className="bg-transparent border-b border-white/10 focus:border-[#bd93f9] outline-none text-[10px] text-white py-1 flex-1 font-mono"
                                placeholder={`Option ${oi + 1}`}
                              />
                              <button onClick={() => removeOption(q.id, oi)} className="text-[#ff5555] text-[10px] opacity-40 hover:opacity-100">✕</button>
                            </div>
                          ))}
                          <button onClick={() => addOption(q.id)} className="text-[9px] text-[#bd93f9] uppercase font-bold mt-1 hover:underline">+ Add Option</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add question buttons */}
                <div className="border border-dashed border-white/10 rounded-2xl p-4">
                  <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-3">Add Question</p>
                  <div className="flex flex-wrap gap-2">
                    {Q_TYPES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => addQuestion(t.value)}
                        className="flex items-center gap-1.5 bg-white/5 hover:bg-[#bd93f9]/20 border border-white/10 hover:border-[#bd93f9]/40 text-[9px] text-gray-300 uppercase font-bold px-3 py-2 rounded-xl transition-all"
                      >
                        <span>{t.icon}</span> {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleFormSave}
                  disabled={loading}
                  className="w-full bg-[#bd93f9] text-black font-black p-4 rounded-2xl uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-xs shadow-lg shadow-[#bd93f9]/20"
                >
                  {loading ? "DEPLOYING_FORM..." : (editingFormId ? "UPDATE_FORM →" : "DEPLOY_FORM →")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            CERT DESIGN MODAL
        ════════════════════════════════════════════════════════════ */}
        {activeModal === "CERT_DESIGN" && (
          <div className="fixed inset-0 z-[20000] flex items-start md:items-center justify-center bg-black/95 backdrop-blur-md p-3 md:p-4 overflow-y-auto">
            <div className="bg-[#0B111A] border border-[#ffb86c]/40 w-full max-w-2xl rounded-2xl md:rounded-3xl p-6 md:p-10 shadow-2xl my-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-black tracking-[0.2em] text-[10px] md:text-xs uppercase text-[#ffb86c]">
                  [ CERT_DESIGN_STUDIO ]
                </h2>
                <button onClick={closeModal} className="text-gray-500 hover:text-white text-lg">✕</button>
              </div>

              <div className="space-y-4">
                {/* Event selector */}
                <select required className={adminInputClass} value={certDesign.eventId} onChange={e => setCertDesign(c => ({ ...c, eventId: e.target.value }))}>
                  <option value="">SELECT_TARGET_EVENT *</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>

                {certDesign.eventId && (
                  <div className="bg-black/30 border border-white/5 rounded-xl p-3">
                    <p className="text-[9px] text-gray-500 uppercase">Eligible (PRESENT status):</p>
                    <p className="text-sm font-bold text-[#ffb86c]">
                      {registrations.filter(r => r.eventId === certDesign.eventId && r.attendanceStatus === "PRESENT").length} operatives
                    </p>
                  </div>
                )}

                {/* Template upload */}
                <div className="relative border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[180px] transition-all hover:border-[#ffb86c]/30 group overflow-hidden">
                  {certPreview ? (
                    <img src={certPreview} className="max-h-48 object-contain rounded-xl" alt="Certificate preview" />
                  ) : (
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest group-hover:text-gray-300">Upload Certificate Template</p>
                      <p className="text-[8px] text-gray-600 mt-1">PNG / JPG / PDF · The participant name will be placed at the coordinates below</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) { setCertFile(f); setCertPreview(URL.createObjectURL(f)); }
                    }}
                  />
                </div>

                {/* Name placement config */}
                <div>
                  <p className="text-[9px] text-[#ffb86c] uppercase font-bold tracking-widest mb-3">Name Placement Configuration</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[8px] text-gray-500 uppercase ml-1">X Position (%)</label>
                      <input type="number" min={0} max={100} value={certDesign.nameX} className={adminInputClass} onChange={e => setCertDesign(c => ({ ...c, nameX: +e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[8px] text-gray-500 uppercase ml-1">Y Position (%)</label>
                      <input type="number" min={0} max={100} value={certDesign.nameY} className={adminInputClass} onChange={e => setCertDesign(c => ({ ...c, nameY: +e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[8px] text-gray-500 uppercase ml-1">Font Size (px)</label>
                      <input type="number" min={10} max={200} value={certDesign.fontSize} className={adminInputClass} onChange={e => setCertDesign(c => ({ ...c, fontSize: +e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[8px] text-gray-500 uppercase ml-1">Font Color</label>
                      <div className="flex gap-2 items-center">
                        <input type="color" value={certDesign.fontColor} onChange={e => setCertDesign(c => ({ ...c, fontColor: e.target.value }))} className="h-10 w-12 rounded-lg border border-white/10 bg-black/60 cursor-pointer" />
                        <input value={certDesign.fontColor} onChange={e => setCertDesign(c => ({ ...c, fontColor: e.target.value }))} className={`${adminInputClass} flex-1`} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview overlay mock */}
                {certPreview && (
                  <div className="relative rounded-xl overflow-hidden border border-[#ffb86c]/20">
                    <img src={certPreview} className="w-full object-contain max-h-48" alt="Preview" />
                    <div
                      className="absolute pointer-events-none font-bold uppercase"
                      style={{
                        left: `${certDesign.nameX}%`,
                        top: `${certDesign.nameY}%`,
                        transform: "translate(-50%, -50%)",
                        fontSize: `${Math.max(8, certDesign.fontSize * 0.2)}px`,
                        color: certDesign.fontColor,
                        textShadow: "0 1px 4px rgba(0,0,0,0.8)"
                      }}
                    >
                      PARTICIPANT NAME
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCertDesignSave}
                  disabled={loading}
                  className="w-full bg-[#ffb86c] text-black font-black p-4 rounded-2xl uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-xs shadow-lg shadow-[#ffb86c]/20"
                >
                  {loading ? "ISSUING_CERTIFICATES..." : "ISSUE_CERTIFICATES →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            EVENT & MEMBER MODALS (unchanged)
        ════════════════════════════════════════════════════════════ */}
        {activeModal && (activeModal === "EVENT" || activeModal === "MEMBER") && (
          <div className="fixed inset-0 z-[20000] flex items-start md:items-center justify-center bg-black/95 backdrop-blur-md p-3 md:p-4 overflow-y-auto">
            <div className={`bg-[#0B111A] border w-full max-w-2xl rounded-2xl md:rounded-3xl p-6 md:p-10 shadow-2xl ${activeModal === "EVENT" ? "border-[#00d2ff]/40" : "border-[#50fa7b]/40"}`}>
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-black tracking-[0.2em] text-[10px] md:text-xs uppercase" style={{ color: activeModal === "EVENT" ? "#00d2ff" : "#50fa7b" }}>
                  [ {editingId ? "UPDATE_REGISTRY" : (activeModal === "EVENT" ? "INIT_DEPLOYMENT" : "RECRUIT_MEMBER")} ]
                </h2>
                <button onClick={closeModal} className="text-gray-500 hover:text-white text-lg">✕</button>
              </div>

              <form onSubmit={activeModal === "EVENT" ? handleEventDeploy : handleMemberDeploy} className="space-y-4">
                <div className="relative border-2 border-dashed border-white/10 rounded-2xl p-6 bg-black/40 flex flex-col items-center justify-center min-h-[140px] transition-all hover:border-white/20 group">
                  {previewUrl ? (
                    <img src={previewUrl} className={`w-full max-h-40 object-contain rounded-xl ${activeModal === "MEMBER" ? "h-24 w-24 mx-auto rounded-full object-cover" : ""}`} alt="Preview" />
                  ) : (
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest group-hover:text-gray-300 underline underline-offset-4">Upload_Visual_Asset</p>
                    </div>
                  )}
                  <input type="file" required={!editingId} accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setPreviewUrl(URL.createObjectURL(f)); } }} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>

                {activeModal === "EVENT" && (
                  <div className="space-y-3 font-mono">
                    <input required placeholder="TITLE" value={newEvent.title} className={adminInputClass} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} />
                    <input placeholder="CATEGORY (e.g. Workshop, Hackathon...)" value={newEvent.category} className={adminInputClass} onChange={e => setNewEvent({ ...newEvent, category: e.target.value })} />
                    {/* Start date / time */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] text-[#00d2ff] uppercase ml-2 font-bold tracking-widest">Start Date</label>
                        <input type="date" required value={newEvent.date} className={adminInputClass} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase ml-2 tracking-widest">Start Time</label>
                        <input type="time" value={newEvent.startTime} className={adminInputClass} onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })} />
                      </div>
                    </div>
                    {/* End date / time */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] text-[#ffb86c] uppercase ml-2 font-bold tracking-widest">End Date <span className="text-gray-600">(cert publish)</span></label>
                        <input type="date" value={newEvent.endDate} className={adminInputClass} onChange={e => setNewEvent({ ...newEvent, endDate: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase ml-2 tracking-widest">End Time</label>
                        <input type="time" value={newEvent.endTime} className={adminInputClass} onChange={e => setNewEvent({ ...newEvent, endTime: e.target.value })} />
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00d2ff] text-[10px] font-black pointer-events-none z-10">LOC:</span>
                      <input required placeholder="VENUE_LOCATION" value={newEvent.venue} style={{ paddingLeft: "70px" }} className={adminInputClass} onChange={e => setNewEvent({ ...newEvent, venue: e.target.value })} />
                    </div>
                    <textarea required rows={2} placeholder="MISSION_DESCRIPTION..." value={newEvent.description} className={adminInputClass} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} />
                  </div>
                )}

                {activeModal === "MEMBER" && (
                  <div className="space-y-3 font-mono">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input required placeholder="FULL_NAME" value={newMember.name} className={`${adminInputClass} md:col-span-2`} onChange={e => setNewMember({ ...newMember, name: e.target.value })} />
                      <input required placeholder="College ID:" value={newMember.collegeId} className={adminInputClass} onChange={e => setNewMember({ ...newMember, collegeId: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input required placeholder="ROLE (e.g. Lead)" value={newMember.role} className={adminInputClass} onChange={e => setNewMember({ ...newMember, role: e.target.value })} />
                      <select className={`${adminInputClass} font-bold cursor-pointer`} value={newMember.section} onChange={e => setNewMember({ ...newMember, section: e.target.value })}>
                        <option value="Student">Student</option>
                        <option value="Faculty">Faculty</option>
                        <option value="Leadership">Leadership</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <input type="number" placeholder="RANK" value={newMember.hierarchy} className={adminInputClass} onChange={e => setNewMember({ ...newMember, hierarchy: parseInt(e.target.value) })} />
                      <div className="relative col-span-2">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#50fa7b] text-[10px] font-black tracking-widest pointer-events-none z-10">LI:</span>
                        <input required placeholder="LINKEDIN_URL" value={newMember.linkedin} style={{ paddingLeft: "85px" }} className={adminInputClass} onChange={e => setNewMember({ ...newMember, linkedin: e.target.value })} />
                      </div>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={loading} className={`w-full text-black font-black p-4 rounded-2xl uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 text-xs md:text-sm mt-4 shadow-lg ${activeModal === "EVENT" ? "bg-[#00d2ff] shadow-[#00d2ff]/20" : "bg-[#50fa7b] shadow-[#50fa7b]/20"}`}>
                  {loading ? "COMMITTING..." : (editingId ? "EXECUTE_UPDATE →" : "EXECUTE_DEPLOYMENT →")}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Admin Dropdown Item style ─────────────────────────────────────────────────
const adminDropdownItem = (color: string): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: "10px",
  padding: "10px 14px", fontSize: "11px", fontWeight: 700,
  fontFamily: "monospace", color, textTransform: "uppercase",
  letterSpacing: "0.08em", cursor: "pointer", transition: "background 0.15s",
  backgroundColor: "transparent",
});

// ─── Action Card ───────────────────────────────────────────────────────────────
const ActionCard = ({ label, sub, color, onClick }: { label: string; sub: string; color: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="p-5 md:p-8 bg-[#0B111A] rounded-2xl md:rounded-3xl text-left group transition-all hover:scale-[1.02] active:scale-[0.99]"
    style={{ border: `1px solid ${color}30` }}
    onMouseEnter={e => (e.currentTarget.style.borderColor = color)}
    onMouseLeave={e => (e.currentTarget.style.borderColor = `${color}30`)}
  >
    <div className="text-lg md:text-2xl font-bold uppercase group-hover:tracking-widest transition-all" style={{ color }}>{label}</div>
    <p className="text-gray-500 text-[9px] uppercase tracking-widest mt-1">{sub}</p>
  </button>
);

// ─── Registry List ─────────────────────────────────────────────────────────────
const RegistryList = ({ title, items, onDel, onEdit, color, type }: any) => (
  <div className="bg-[#0a0c10] border border-white/5 rounded-2xl md:rounded-3xl p-4 md:p-6 font-mono">
    <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-4 md:mb-6 flex items-center gap-2" style={{ color }}>
      <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: color }} />
      {title}
    </h3>
    <div className="space-y-3 max-h-72 md:max-h-80 overflow-y-auto pr-1 md:pr-2 custom-scrollbar">
      {items.map((item: any) => (
        <div key={item.id} className="flex justify-between items-center bg-white/5 p-3 md:p-4 rounded-xl border border-white/5 group hover:border-white/20 transition-all gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img src={type === "event" ? item.posterUrl : item.image} className={`w-8 h-8 object-cover shrink-0 ${type === "member" ? "rounded-full" : "rounded-md"}`} alt="Visual" />
            <div className="min-w-0">
              <h4 className="text-xs font-bold uppercase tracking-wider truncate">{type === "event" ? item.title : item.name}</h4>
              <p className="text-[9px] text-gray-500 uppercase">{type === "event" ? item.category : (item.collegeId || item.section)}</p>
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <button onClick={() => onEdit(item)} style={{ color }} className="text-[10px] font-bold uppercase opacity-50 hover:opacity-100 transition-opacity">Edit</button>
            <button onClick={() => confirm("TERMINATE_NODE?") && onDel(item.id)} className="text-[#ff5555] text-[10px] font-bold uppercase opacity-30 hover:opacity-100 transition-opacity">Del</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);