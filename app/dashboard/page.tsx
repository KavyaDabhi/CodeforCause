"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { GoogleAuthProvider, linkWithPopup } from "firebase/auth";
import { jsPDF } from "jspdf";
import { CertificatePreview } from "@/components/CertificateRenderer";

const cyberStyles = `
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #00d2ff33; border-radius: 10px; }
  @keyframes fadeSlideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  .fade-in { animation: fadeSlideIn 0.3s ease forwards; }
  .modal-scroll { -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
  @keyframes certReveal { from { opacity:0; transform:scale(0.96) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
  .cert-reveal { animation: certReveal 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
  @keyframes shimmer { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
  .cert-shimmer { animation: shimmer 1.8s ease-in-out infinite; }
  @media (max-width: 640px) { .touch-target { min-height: 44px; min-width: 44px; } }
  .safe-bottom { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
  .safe-top { padding-top: max(4rem, calc(env(safe-area-inset-top) + 4rem)); }
`;

const calcScore = (certs: number, present: number) => certs * 2 + present;

const RANK_COLORS: Record<number, string> = { 1: "#FFD700", 2: "#C0C0C0", 3: "#CD7F32" };

function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) { document.body.style.overflow = ""; return; }
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [active]);
}

// ── Card-level PDF download button ───────────────────────────────────────────
function CertDownloadButton({ cert, disabled }: { cert: any; disabled?: boolean }) {
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleClick = async () => {
    if (phase === "loading" || disabled) return;
    setActive(true);
    setPhase("loading");
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image(); i.crossOrigin = "anonymous";
        i.onload = () => res(i); i.onerror = () => rej(new Error("img"));
        i.src = cert.templateUrl;
      });

      const family = cert.fontFamily || "Playfair Display";
      const size = cert.fontSize || 48;
      
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const x = ((cert.nameX ?? 50) / 100) * img.naturalWidth;
      const y = ((cert.nameY ?? 50) / 100) * img.naturalHeight;
      
      // Font is already guaranteed loaded by the parent card wrapper
      ctx.font = `bold ${size}px "${family}", "Georgia", serif`;
      ctx.fillStyle = cert.fontColor || "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
      ctx.fillText(cert.userName || "Recipient", x, y);

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      const fileName = `${cert.userName}_${cert.eventTitle}.pdf`.replace(/[^a-z0-9_.-]/gi, "_").toLowerCase();
      pdf.save(fileName);
      
      setPhase("done");
      setTimeout(() => setPhase("idle"), 2000);
    } catch (err) {
      console.error("Certificate download failed:", err);
      setPhase("error");
      setTimeout(() => setPhase("idle"), 2000);
    }
  };

  return (
    <button onClick={handleClick} disabled={disabled || phase === "loading"} className="touch-target text-[9px] uppercase font-bold tracking-widest text-black bg-[#50fa7b] px-3 py-2 rounded-lg hover:shadow-[0_0_12px_rgba(80,250,123,0.4)] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 min-w-[60px] justify-center relative z-30">
      {phase === "loading" && <span className="w-2 h-2 rounded-full bg-black animate-pulse" />}
      {phase === "done"    && <>✓ PDF Saved</>}
      {phase === "error"   && <>✗ Error</>}
      {phase === "idle"    && <>↓ PDF</>}
    </button>
  );
}

// ── The Strict Certificate Card Wrapper ──────────────────────────────────────
function CertificateDashboardCard({ cert, onPreview }: { cert: any; onPreview: () => void }) {
  const [isFontReady, setIsFontReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadAsset = async () => {
      const family = cert.fontFamily || "Playfair Display";
      try {
        const fontId = `font-${family.replace(/\s+/g, '-')}`;
        
        // 1. Inject the font CSS if it doesn't exist
        if (!document.getElementById(fontId)) {
          const link = document.createElement("link");
          link.id = fontId;
          link.rel = "stylesheet";
          link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;700&display=swap`;
          
          await new Promise((res) => {
            link.onload = res;
            link.onerror = res;
            document.head.appendChild(link);
          });
        }

        // 2. Force the browser to fetch the curves and wait
        await document.fonts.load(`bold 48px "${family}"`);
        await document.fonts.ready;
        
        // 3. Give the UI a tiny 100ms buffer to apply the font to the DOM
        await new Promise(r => setTimeout(r, 100));

      } catch(e) {
        console.error("Card font load error", e);
      } finally {
        if (mounted) setIsFontReady(true);
      }
    };
    
    loadAsset();
    return () => { mounted = false; };
  }, [cert]);

  return (
    <div className="bg-[#0a0c10] border border-white/5 rounded-2xl overflow-hidden group hover:border-[#50fa7b]/30 transition-all flex flex-col relative">
      
      {/* 🚀 THE STRICT LOCKDOWN OVERLAY */}
      {!isFontReady && (
        <div className="absolute inset-0 z-40 bg-[#050608]/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#50fa7b]/30 border-t-[#50fa7b] rounded-full animate-spin mb-2" />
          <span className="text-[#50fa7b] text-[8px] font-bold uppercase tracking-widest animate-pulse text-center px-4">
            Decrypting Assets...
          </span>
        </div>
      )}

      {/* Thumbnail */}
      <button onClick={onPreview} disabled={!isFontReady} className="relative w-full overflow-hidden bg-black border-b border-white/5 group/thumb focus:outline-none focus-visible:ring-2 focus-visible:ring-[#50fa7b]/50" style={{ aspectRatio: "16/7" }}>
        {cert.templateUrl ? (
          <>
            <img src={cert.templateUrl} alt={cert.eventTitle} className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-[1.04]" style={{ filter: "brightness(0.65)" }} />
            <div className="absolute pointer-events-none" style={{ left: `${cert.nameX ?? 50}%`, top: `${cert.nameY ?? 50}%`, transform: "translate(-50%,-50%)" }}>
              <span className="font-bold whitespace-nowrap" style={{ color: cert.fontColor || "#ffffff", fontSize: "clamp(8px, 1.6vw, 15px)", textShadow: "0 1px 6px rgba(0,0,0,0.7)", fontFamily: `"${cert.fontFamily || "Playfair Display"}", serif` }}>
                {cert.userName}
              </span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/thumb:bg-black/25 transition-all">
              <div className="opacity-0 group-hover/thumb:opacity-100 scale-90 group-hover/thumb:scale-100 transition-all duration-200">
                <div className="bg-[#50fa7b] text-black text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  Preview
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#0d1117]">
            <div className="text-center opacity-40">
              <svg className="w-8 h-8 text-[#50fa7b] mx-auto mb-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>
              <p className="text-[8px] text-gray-600 uppercase tracking-widest">No Template</p>
            </div>
          </div>
        )}
      </button>

      <div className="p-4 flex flex-col gap-3 flex-1 relative z-10">
        <div className="flex-1">
          <h3 className="text-[11px] sm:text-sm font-bold uppercase tracking-wider text-white group-hover:text-[#50fa7b] transition-colors leading-snug line-clamp-2">
            {cert.eventTitle}
          </h3>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Issued: {cert.issueDate}</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[8px] text-gray-600 font-mono truncate flex-1">
            {(cert.certHash || cert.id).slice(0, 10)}…
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={onPreview} disabled={!isFontReady} className="touch-target text-[9px] uppercase font-bold tracking-widest text-[#50fa7b] border border-[#50fa7b]/30 px-2.5 py-2 rounded-lg hover:bg-[#50fa7b]/10 transition-all flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              View
            </button>
            <CertDownloadButton cert={cert} disabled={!isFontReady} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function UserDashboard() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<"MISSIONS" | "CERTIFICATES" | "LEADERBOARD">("MISSIONS");

  const [myMissions, setMyMissions]         = useState<any[]>([]);
  const [myCertificates, setMyCertificates] = useState<any[]>([]);
  const [eventDetails, setEventDetails]     = useState<Record<string, any>>({});
  const [selectedEvent, setSelectedEvent]   = useState<any | null>(null);
  const [loadingData, setLoadingData]       = useState(true);

  const [leaderboard, setLeaderboard]       = useState<any[]>([]);
  const [loadingLB, setLoadingLB]           = useState(false);

  const [pushStatus, setPushStatus]         = useState<"idle" | "subscribed" | "denied" | "unsupported">("idle");
  const [pushLoading, setPushLoading]       = useState(false);

  const [customName, setCustomName]         = useState<string | null>(null);
  const [firestorePhoto, setFirestorePhoto] = useState<string | null>(null);

  const [previewCert, setPreviewCert]       = useState<any | null>(null);

  useScrollLock(!!(selectedEvent || previewCert));

  useEffect(() => {
    if (status === "unauthenticated") redirect("/login");
  }, [status]);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) { setPushStatus("unsupported"); return; }
    if (Notification.permission === "granted") setPushStatus("subscribed");
    else if (Notification.permission === "denied") setPushStatus("denied");
  }, []);

  useEffect(() => {
    const fetchIdentity = async () => {
      if (session?.user?.email) {
        try {
          const q = query(collection(db, "users"), where("email", "==", session.user.email.toLowerCase()));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            setCustomName(data.displayName || data.FULL_NAME || data.name || null);
            setFirestorePhoto(data.photoURL || null);
          }
        } catch (error) { console.error("Identity sync failed:", error); }
      }
    };
    fetchIdentity();
  }, [session]);

  useEffect(() => {
    if (!session?.user?.email) return;
    const userEmail = session.user.email.toLowerCase();

    const qMissions = query(collection(db, "registrations"), where("userEmail", "==", userEmail));
    const unsubMissions = onSnapshot(qMissions, async snapshot => {
      const missions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMyMissions(missions);
      const uniqueIds = [...new Set(missions.map((m: any) => m.eventId).filter(Boolean))];
      const details: Record<string, any> = {};
      await Promise.all(uniqueIds.map(async (eventId) => {
        try {
          const eventDoc = await getDoc(doc(db, "events", eventId));
          if (eventDoc.exists()) details[eventId] = { id: eventDoc.id, ...eventDoc.data() };
        } catch (e) { console.error("Event fetch failed:", e); }
      }));
      setEventDetails(prev => ({ ...prev, ...details }));
    });

    const qCerts = query(collection(db, "certificates"), where("userEmail", "==", userEmail));
    const unsubCerts = onSnapshot(qCerts, snapshot => {
      setMyCertificates(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingData(false);
    });

    return () => { unsubMissions(); unsubCerts(); };
  }, [session?.user?.email]);

  useEffect(() => {
    if (activeTab !== "LEADERBOARD") return;
    if (leaderboard.length > 0) return;
    buildLeaderboard();
  }, [activeTab]);

  const buildLeaderboard = async () => {
    setLoadingLB(true);
    try {
      const [regSnap, certSnap] = await Promise.all([
        getDocs(collection(db, "registrations")),
        getDocs(collection(db, "certificates")),
      ]);
      const tally: Record<string, { email: string; name: string; present: number; certs: number }> = {};
      regSnap.docs.forEach(d => {
        const data = d.data();
        const email = data.userEmail?.toLowerCase();
        if (!email) return;
        if (!tally[email]) tally[email] = { email, name: data.userName || email.split("@")[0], present: 0, certs: 0 };
        if (data.attendanceStatus === "PRESENT") tally[email].present += 1;
        if (data.userName && data.userName.length > tally[email].name.length) tally[email].name = data.userName;
      });
      certSnap.docs.forEach(d => {
        const data = d.data();
        const email = data.userEmail?.toLowerCase();
        if (!email) return;
        if (!tally[email]) tally[email] = { email, name: data.userName || email.split("@")[0], present: 0, certs: 0 };
        tally[email].certs += 1;
        if (data.userName && data.userName.length > tally[email].name.length) tally[email].name = data.userName;
      });
      const sorted = Object.values(tally)
        .map(t => ({ ...t, score: calcScore(t.certs, t.present) }))
        .filter(t => t.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
      setLeaderboard(sorted);
    } catch (err) { console.error("Leaderboard build failed:", err); }
    setLoadingLB(false);
  };

  const handlePushSubscribe = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) { setPushStatus("unsupported"); return; }
    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setPushStatus("denied"); setPushLoading(false); return; }
      setPushStatus("subscribed");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      await scheduleEventNotifications(reg);
      if (session?.user?.email) {
        await setDoc(doc(db, "pushSubscriptions", session.user.email.toLowerCase()),
          { email: session.user.email.toLowerCase(), subscribedAt: new Date().toISOString(), active: true },
          { merge: true });
      }
    } catch (err) { console.error("Push subscription failed:", err); }
    setPushLoading(false);
  };

  const scheduleEventNotifications = async (swReg: ServiceWorkerRegistration) => {
    for (const mission of myMissions) {
      const event = eventDetails[mission.eventId];
      if (!event?.countdownTarget) continue;
      const notifyAt = new Date(event.countdownTarget).getTime() - 24 * 60 * 60 * 1000;
      if (notifyAt <= Date.now()) continue;
      swReg.active?.postMessage({
        type: "SCHEDULE_NOTIFICATION", delay: notifyAt - Date.now(),
        title: `⚡ Tomorrow: ${event.title}`,
        body: `Your event at ${event.venue || "CHARUSAT"} starts in 24 hours. Don't miss it!`,
        tag: `event-${mission.eventId}`, url: `/dashboard`,
      });
    }
  };

  const handleLinkGoogle = async () => {
    const provider = new GoogleAuthProvider();
    if (!auth.currentUser) return;
    try {
      const result = await linkWithPopup(auth.currentUser, provider);
      const user = result.user;
      const q = query(collection(db, "users"), where("email", "==", user.email?.toLowerCase()));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        await updateDoc(doc(db, "users", snapshot.docs[0].id), { photoURL: user.photoURL });
        setFirestorePhoto(user.photoURL);
        alert("IDENTITY_LINKED: Google Profile Synchronized.");
      }
    } catch (error: any) {
      if (error.code === "auth/credential-already-in-use") alert("ERROR: This Google account is already linked to another operative.");
      else alert("SYSTEM_FAILURE: Link aborted.");
    }
  };

  if (status === "loading") return (
    <div className="min-h-screen bg-[#05060a] flex items-center justify-center">
      <div className="w-3 h-6 bg-[#00d2ff] animate-pulse" />
    </div>
  );
  if (!session?.user) return null;

  const finalName  = customName || session.user.name || session.user.email?.split("@")[0] || "OPERATIVE";
  const avatarName = /\d/.test(finalName) ? "OP" : finalName;
  const avatarSrc  = firestorePhoto || session.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(avatarName)}&background=0f111a&color=00d2ff&bold=true`;
  const myEmail    = session.user.email?.toLowerCase() || "";
  const myRank     = leaderboard.findIndex(u => u.email === myEmail) + 1;

  return (
    <div className="min-h-screen bg-[#05060a] safe-top px-3 sm:px-4 md:px-8 font-mono text-white selection:bg-[#50fa7b] selection:text-black safe-bottom">
      <style>{cyberStyles}</style>

      <div className="max-w-5xl mx-auto">

        {/* ── PROFILE HEADER ── */}
        <div className="bg-[#0B111A] border border-white/5 rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 mb-5 md:mb-8 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-[#00d2ff]/5 rounded-full blur-[80px] -z-10 pointer-events-none" />
          <div className="flex items-start gap-3 sm:gap-4 mb-3">
            <img
              src={avatarSrc} alt="Profile"
              className="rounded-full border-2 border-[#00d2ff] shadow-[0_0_20px_rgba(0,210,255,0.2)] shrink-0"
              style={{ width: "clamp(2.8rem,10vw,5.5rem)", height: "clamp(2.8rem,10vw,5.5rem)" }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-0.5">
                <h1 className="font-black uppercase tracking-wider leading-tight" style={{ fontSize: "clamp(0.85rem, 4vw, 1.75rem)" }}>
                  {finalName}
                </h1>
                <Link
                  href="/?scrollTo=home"
                  className="touch-target flex items-center gap-1 text-gray-500 hover:text-[#00d2ff] transition-colors text-[9px] uppercase tracking-widest shrink-0 mt-0.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span className="hidden sm:inline">Return_To_Root</span>
                </Link>
              </div>
              <span className="inline-block bg-[#50fa7b]/10 text-[#50fa7b] border border-[#50fa7b]/20 px-2 py-0.5 rounded-full text-[8px] tracking-widest uppercase font-bold mb-1">
                Authorized
              </span>
              <p className="text-gray-500 text-[9px] sm:text-[10px] tracking-widest truncate">{session.user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {pushStatus !== "unsupported" && (
              <button
                onClick={pushStatus === "subscribed" ? undefined : handlePushSubscribe}
                disabled={pushLoading || pushStatus === "denied"}
                className={`touch-target flex items-center gap-1.5 text-[9px] px-3 py-2 rounded-full border font-bold uppercase tracking-widest transition-all ${
                  pushStatus === "subscribed" ? "bg-[#ffb86c]/10 text-[#ffb86c] border-[#ffb86c]/30 cursor-default"
                  : pushStatus === "denied"   ? "bg-[#ff5555]/10 text-[#ff5555] border-[#ff5555]/20 opacity-60 cursor-not-allowed"
                  : "bg-white/5 text-gray-400 border-white/10 hover:border-[#ffb86c]/40 hover:text-[#ffb86c] cursor-pointer"
                }`}
              >
                {pushLoading ? <span className="w-2 h-2 rounded-full bg-[#ffb86c] animate-pulse" /> : <span>{pushStatus === "subscribed" ? "🔔" : "🔕"}</span>}
                {pushStatus === "subscribed" ? "Alerts_On" : pushStatus === "denied" ? "Blocked" : "Enable_Alerts"}
              </button>
            )}
            {!firestorePhoto && !session.user.image && (
              <button
                onClick={handleLinkGoogle}
                className="touch-target flex items-center gap-1.5 text-[9px] bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-full transition-all text-[#00d2ff] uppercase tracking-tighter"
              >
                <img src="https://authjs.dev/img/providers/google.svg" width="10" alt="G" />
                Sync_Google
              </button>
            )}
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex mb-5 md:mb-8 border-b border-white/10 overflow-x-auto custom-scrollbar -mx-3 px-3 sm:-mx-0 sm:px-0">
          {([
            { id: "MISSIONS",     label: "Events",      count: myMissions.length,     color: "#00d2ff" },
            { id: "CERTIFICATES", label: "Certs",       count: myCertificates.length, color: "#50fa7b" },
            { id: "LEADERBOARD",  label: "Leaderboard", count: null,                  color: "#ffb86c" },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="touch-target flex-1 pb-3 px-2 sm:px-4 text-[10px] sm:text-xs uppercase tracking-widest font-bold transition-all border-b-2 whitespace-nowrap"
              style={{
                borderColor: activeTab === tab.id ? tab.color : "transparent",
                color: activeTab === tab.id ? tab.color : "#4b5563",
              }}
            >
              {tab.label}
              {tab.count !== null && (
                <span
                  className="ml-1.5 text-[8px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: activeTab === tab.id ? `${tab.color}20` : "rgba(255,255,255,0.05)",
                    color: activeTab === tab.id ? tab.color : "#6b7280",
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── CONTENT ── */}
        {loadingData ? (
          <div className="text-[#00d2ff] font-mono animate-pulse tracking-widest text-center py-16 text-xs">
            [ Fetching_Personal_Records... ]
          </div>
        ) : (
          <div className="pb-8">

            {/* MISSIONS TAB */}
            {activeTab === "MISSIONS" && (
              <div className="space-y-3 fade-in">
                {myMissions.length > 0 ? myMissions.map(mission => {
                  const event = eventDetails[mission.eventId];
                  return (
                    <div
                      key={mission.id}
                      onClick={() => event && setSelectedEvent(event)}
                      className={`flex items-center gap-3 bg-[#0a0c10] border border-white/5 p-3.5 sm:p-5 rounded-xl transition-all group ${event ? "hover:border-[#00d2ff]/50 hover:bg-[#0d1420] cursor-pointer active:scale-[0.99]" : "cursor-default"}`}
                    >
                      {event?.posterUrl ? (
                        <img
                          src={event.posterUrl} alt={event.title}
                          className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl object-cover shrink-0 border border-white/10 group-hover:border-[#00d2ff]/40 transition-all"
                        />
                      ) : (
                        <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <span className="text-[#00d2ff] text-base">⚡</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-[11px] sm:text-sm font-bold uppercase tracking-wide text-white group-hover:text-[#00d2ff] transition-colors leading-tight line-clamp-2 flex-1">
                            {mission.eventTitle}
                          </h3>
                          <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase font-bold tracking-widest shrink-0 ${
                            mission.attendanceStatus === "PRESENT" ? "bg-[#50fa7b]/10 text-[#50fa7b] border border-[#50fa7b]/20"
                            : mission.attendanceStatus === "ABSENT" ? "bg-[#ff5555]/10 text-[#ff5555] border border-[#ff5555]/20"
                            : "bg-[#00d2ff]/10 text-[#00d2ff] border border-[#00d2ff]/20"
                          }`}>
                            {mission.attendanceStatus || "Reg'd"}
                          </span>
                        </div>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest">{event?.date || "—"}</p>
                        {event?.venue && (
                          <p className="text-[9px] text-gray-600 uppercase tracking-widest mt-0.5 truncate">{event.venue}</p>
                        )}
                      </div>
                      {event && (
                        <div className="shrink-0 text-gray-600 group-hover:text-[#00d2ff] transition-all group-hover:translate-x-0.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                    <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-4">No Events Registered.</p>
                    <Link href="/?scrollTo=operations" className="inline-block text-[#00d2ff] border border-[#00d2ff]/30 px-5 py-3 rounded-xl text-[10px] uppercase tracking-widest hover:bg-[#00d2ff] hover:text-black transition-all">
                      Browse_Network_Events
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* ── CERTIFICATES TAB ── */}
            {activeTab === "CERTIFICATES" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 fade-in">
                {myCertificates.length > 0 ? myCertificates.map(cert => (
                  <CertificateDashboardCard 
                    key={cert.id} 
                    cert={cert} 
                    onPreview={() => setPreviewCert(cert)} 
                  />
                )) : (
                  <div className="col-span-2 text-center py-16 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                    <p className="text-gray-500 text-[10px] uppercase tracking-widest">No Certificates Issued.</p>
                  </div>
                )}
              </div>
            )}

            {/* LEADERBOARD TAB */}
            {activeTab === "LEADERBOARD" && (
              <div className="fade-in">
                {myRank > 0 && (
                  <div className="bg-[#0B111A] border border-[#ffb86c]/30 rounded-xl md:rounded-2xl p-4 mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#ffb86c]/10 border border-[#ffb86c]/30 flex items-center justify-center shrink-0">
                      <span className="text-[#ffb86c] font-black text-base">#{myRank}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] text-gray-500 uppercase tracking-widest mb-0.5">Your Rank</p>
                      <p className="text-white font-black uppercase tracking-wider text-xs truncate">{finalName}</p>
                      <p className="text-[9px] text-[#ffb86c] mt-0.5 flex flex-wrap gap-x-2">
                        <span>{calcScore(leaderboard[myRank-1]?.certs??0, leaderboard[myRank-1]?.present??0)} pts</span>
                        <span>{leaderboard[myRank-1]?.certs??0} certs</span>
                        <span>{leaderboard[myRank-1]?.present??0} attended</span>
                      </p>
                    </div>
                  </div>
                )}

                {loadingLB ? (
                  <div className="text-[#ffb86c] animate-pulse tracking-widest text-center py-16 text-xs uppercase">[ Compiling_Rankings... ]</div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                    <p className="text-gray-500 text-xs uppercase tracking-widest">No data yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((user, idx) => {
                      const rank = idx + 1;
                      const rankColor = RANK_COLORS[rank] || "#ffffff";
                      const isMe = user.email === myEmail;
                      return (
                        <div
                          key={user.email}
                          className={`flex items-center gap-2.5 p-3 sm:p-4 rounded-xl border transition-all ${isMe ? "bg-[#ffb86c]/5 border-[#ffb86c]/30" : "bg-[#0a0c10] border-white/5 hover:border-white/10"}`}
                        >
                          <div className="w-8 text-center shrink-0">
                            {rank <= 3
                              ? <span className="text-lg">{rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</span>
                              : <span className="text-xs font-black text-gray-500">#{rank}</span>}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 shrink-0 overflow-hidden">
                            <img
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0f111a&color=ffb86c&bold=true&size=32`}
                              alt={user.name} className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-wide truncate ${isMe ? "text-[#ffb86c]" : "text-white"}`}>
                              {user.name}{isMe && <span className="text-[8px] ml-1 text-[#ffb86c]/60">(You)</span>}
                            </p>
                            <p className="text-[8px] text-gray-600 truncate hidden xs:block">{user.email}</p>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                            <div className="flex flex-col items-end gap-0.5 sm:hidden">
                              <span className="text-[8px] text-[#50fa7b] font-bold">{user.certs}c</span>
                              <span className="text-[8px] text-[#00d2ff] font-bold">{user.present}p</span>
                            </div>
                            <div className="hidden sm:flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-[8px] text-gray-600 uppercase tracking-widest">Certs</p>
                                <p className="text-xs font-bold text-[#50fa7b]">{user.certs}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[8px] text-gray-600 uppercase tracking-widest">Present</p>
                                <p className="text-xs font-bold text-[#00d2ff]">{user.present}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[8px] text-gray-600 uppercase tracking-widest">Score</p>
                              <p className="text-xs sm:text-sm font-black" style={{ color: rankColor }}>{user.score}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-center text-[8px] sm:text-[9px] text-gray-700 uppercase tracking-widest pt-4">
                      Score = Certificates × 2 + Events Attended × 1
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CERTIFICATE PREVIEW MODAL ── */}
      {previewCert && (
        <CertificatePreview
          cert={previewCert}
          onClose={() => setPreviewCert(null)}
        />
      )}

      {/* ── EVENT DETAIL MODAL ── */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full sm:max-w-[1100px] bg-[#0B111A] border border-[#2a2e3f] rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "92dvh" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-[#0f172a] px-4 py-2.5 flex justify-between items-center border-b border-[#2a2e3f] shrink-0">
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-[#ff5555]" />
                <div className="w-2 h-2 rounded-full bg-[#f1fa8c]" />
                <div className="w-2 h-2 rounded-full bg-[#50fa7b]" />
              </div>
              <div className="text-gray-400 text-[9px] sm:text-[10px] font-mono tracking-widest uppercase truncate px-3">
                {selectedEvent.title.toLowerCase().replace(/\s+/g, "_")}.bin
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="touch-target text-gray-400 hover:text-white font-bold text-base p-1 hover:bg-white/5 rounded w-8 h-8 flex items-center justify-center"
              >✕</button>
            </div>

            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
              <div className="lg:w-[45%] bg-black flex items-center justify-center border-b lg:border-b-0 lg:border-r border-[#2a2e3f] shrink-0" style={{ maxHeight: "clamp(140px, 28vw, 280px)" }}>
                {selectedEvent.posterUrl
                  ? <img src={selectedEvent.posterUrl} alt={selectedEvent.title} className="w-full h-full object-contain" />
                  : <div className="py-8 text-gray-600 font-mono tracking-widest text-xs">[ NO_VISUAL_FEED ]</div>
                }
              </div>

              <div className="lg:w-[55%] bg-[#0B111A] flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 custom-scrollbar modal-scroll">
                  <div className="bg-[#00d2ff]/5 text-[#00d2ff] text-[9px] sm:text-[10px] font-bold px-3 py-1 border border-[#00d2ff]/30 w-fit mb-3 uppercase tracking-widest">
                    [ {(selectedEvent.category || "EVENT").toUpperCase()} ]
                  </div>
                  <h2 className="text-white font-black mb-2 uppercase leading-tight" style={{ fontSize: "clamp(1.2rem, 5vw, 3rem)" }}>
                    {selectedEvent.title}
                  </h2>
                  <p className="text-[#50fa7b] text-[10px] sm:text-xs font-bold mb-4 font-mono tracking-tighter">
                    &gt; CHARUSAT_NODE_ACTIVE
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3">
                    <div className="bg-[#121824] p-3 border border-white/5">
                      <div className="text-gray-500 text-[8px] uppercase font-bold tracking-widest mb-1">DATE</div>
                      <div className="text-white text-[10px] sm:text-xs font-mono">{selectedEvent.date || "TBA"}</div>
                    </div>
                    <div className="bg-[#121824] p-3 border border-white/5">
                      <div className="text-gray-500 text-[8px] uppercase font-bold tracking-widest mb-1">TIME</div>
                      <div className="text-white text-[10px] sm:text-xs font-mono">{selectedEvent.startTime || "TBA"}</div>
                    </div>
                  </div>
                  <div className="bg-[#121824] p-3 border border-white/5 mb-4">
                    <div className="text-gray-500 text-[8px] uppercase tracking-widest font-bold mb-1">LOCATION</div>
                    <div className="text-white text-[10px] sm:text-xs font-mono">{selectedEvent.venue || "ENCRYPTED_NODE"}</div>
                  </div>
                  <div className="mb-4">
                    <h3 className="text-[#50fa7b] text-[9px] font-bold uppercase tracking-[0.3em] mb-2 font-mono">$&gt; MISSION_DESCRIPTION</h3>
                    <div className="text-gray-400 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-mono">
                      {selectedEvent.description}
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6 bg-[#0B111A] border-t border-white/5 shrink-0 safe-bottom">
                  <Link
                    href={`/register/${selectedEvent.id}`}
                    className="block w-full text-center py-4 font-black font-mono uppercase tracking-[0.15em] transition-all text-[10px] sm:text-xs bg-[#50fa7b] hover:bg-white text-black shadow-[0_0_30px_rgba(80,250,123,0.3)] rounded-lg"
                  >
                    INITIALIZE_REGISTRATION ↗
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-[#0f172a] px-4 py-2 flex justify-between items-center border-t border-[#2a2e3f] shrink-0">
              <div className="text-[#50fa7b] text-[8px] tracking-widest uppercase font-bold animate-pulse">[ SECURE_CONNECTION_STABLE ]</div>
              <div className="text-gray-500 text-[8px] uppercase font-bold tracking-widest">PORT: 8080</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}