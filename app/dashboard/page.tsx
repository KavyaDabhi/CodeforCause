"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { GoogleAuthProvider, linkWithPopup } from "firebase/auth";
import { downloadCertificate } from "@/lib/downloadCertificate";

const cyberStyles = `
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #00d2ff33; border-radius: 10px; }
`;

export default function UserDashboard() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<"MISSIONS" | "CERTIFICATES">("MISSIONS");

  const [myMissions, setMyMissions] = useState<any[]>([]);
  const [myCertificates, setMyCertificates] = useState<any[]>([]);
  const [eventDetails, setEventDetails] = useState<Record<string, any>>({});
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null); // ✅ modal state
  const [loadingData, setLoadingData] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [customName, setCustomName] = useState<string | null>(null);
  const [firestorePhoto, setFirestorePhoto] = useState<string | null>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = selectedEvent ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [selectedEvent]);

  useEffect(() => {
    if (status === "unauthenticated") redirect("/login");
  }, [status]);

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
        } catch (error) {
          console.error("Failed to sync identity:", error);
        }
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

      // Fetch event details for each unique eventId
      const uniqueEventIds = [...new Set(missions.map((m: any) => m.eventId).filter(Boolean))];
      const details: Record<string, any> = {};
      await Promise.all(
        uniqueEventIds.map(async (eventId) => {
          try {
            const eventDoc = await getDoc(doc(db, "events", eventId));
            if (eventDoc.exists()) {
              details[eventId] = { id: eventDoc.id, ...eventDoc.data() };
            }
          } catch (e) {
            console.error("Failed to fetch event:", eventId, e);
          }
        })
      );
      setEventDetails(prev => ({ ...prev, ...details }));
    });

    const qCertificates = query(collection(db, "certificates"), where("userEmail", "==", userEmail));
    const unsubCertificates = onSnapshot(qCertificates, snapshot => {
      setMyCertificates(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingData(false);
    });

    return () => { unsubMissions(); unsubCertificates(); };
  }, [session?.user?.email]);

  const handleLinkGoogle = async () => {
    const provider = new GoogleAuthProvider();
    if (!auth.currentUser) return;
    try {
      const result = await linkWithPopup(auth.currentUser, provider);
      const user = result.user;
      const q = query(collection(db, "users"), where("email", "==", user.email?.toLowerCase()));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const userDocRef = doc(db, "users", snapshot.docs[0].id);
        await updateDoc(userDocRef, { photoURL: user.photoURL });
        setFirestorePhoto(user.photoURL);
        alert("IDENTITY_LINKED: Google Profile Synchronized.");
      }
    } catch (error: any) {
      if (error.code === "auth/credential-already-in-use") {
        alert("ERROR: This Google account is already linked to another operative.");
      } else {
        alert("SYSTEM_FAILURE: Link aborted.");
      }
    }
  };

  const handleDownload = async (cert: any) => {
    setDownloadingId(cert.id);
    try {
      await downloadCertificate({
        userName: cert.userName,
        eventTitle: cert.eventTitle,
        templateUrl: cert.templateUrl,
        nameX: cert.nameX ?? 50,
        nameY: cert.nameY ?? 50,
        fontSize: cert.fontSize ?? 48,
        fontColor: cert.fontColor ?? "#ffffff",
        fontFamily: cert.fontFamily ?? "Playfair Display",
        certHash: cert.certHash || cert.id,
        issueDate: cert.issueDate,
      });
    } catch (err) {
      console.error("Certificate download failed:", err);
      alert("DOWNLOAD_FAILED: Could not generate certificate.");
    } finally {
      setDownloadingId(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#05060a] flex items-center justify-center">
        <div className="w-3 h-6 bg-[#00d2ff] animate-pulse"></div>
      </div>
    );
  }

  if (!session?.user) return null;

  const finalName = customName || session.user.name || session.user.email?.split("@")[0] || "OPERATIVE";
  const avatarName = /\d/.test(finalName) ? "OP" : finalName;
  const avatarSrc = firestorePhoto || session.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(avatarName)}&background=0f111a&color=00d2ff&bold=true`;

  return (
    <div className="min-h-screen bg-[#05060a] pt-20 md:pt-24 px-4 md:px-8 font-mono text-white selection:bg-[#50fa7b] selection:text-black pb-12">
      <style>{cyberStyles}</style>

      <div className="max-w-5xl mx-auto">

        {/* PROFILE HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 bg-[#0B111A] border border-white/5 rounded-3xl p-6 md:p-8 mb-8 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d2ff]/5 rounded-full blur-[80px] -z-10 pointer-events-none" />
          <img src={avatarSrc} alt="Profile" className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-[#00d2ff] shadow-[0_0_20px_rgba(0,210,255,0.2)]" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider truncate">{finalName}</h1>
              <span className="bg-[#50fa7b]/10 text-[#50fa7b] border border-[#50fa7b]/20 px-3 py-1 rounded-full text-[10px] tracking-widest uppercase font-bold shrink-0">Authorized</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-gray-500 text-xs md:text-sm tracking-widest truncate">{session.user.email}</p>
              {!firestorePhoto && !session.user.image && (
                <button
                  onClick={handleLinkGoogle}
                  className="flex items-center gap-2 text-[9px] bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1 rounded transition-all text-[#00d2ff] uppercase tracking-tighter"
                >
                  <img src="https://authjs.dev/img/providers/google.svg" width="10" alt="G" />
                  Sync_Google_Identity
                </button>
              )}
            </div>
          </div>
          <Link href="/?scrollTo=home" className="hidden md:flex items-center gap-2 text-gray-500 hover:text-[#00d2ff] transition-colors text-xs uppercase tracking-widest">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Return_To_Root
          </Link>
        </div>

        {/* TABS */}
        <div className="flex gap-4 mb-8 border-b border-white/10 pb-px overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab("MISSIONS")}
            className={`pb-4 px-2 text-xs md:text-sm uppercase tracking-widest font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === "MISSIONS" ? "border-[#00d2ff] text-[#00d2ff]" : "border-transparent text-gray-600 hover:text-gray-300"}`}
          >
            My Events ({myMissions.length})
          </button>
          <button
            onClick={() => setActiveTab("CERTIFICATES")}
            className={`pb-4 px-2 text-xs md:text-sm uppercase tracking-widest font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === "CERTIFICATES" ? "border-[#50fa7b] text-[#50fa7b]" : "border-transparent text-gray-600 hover:text-gray-300"}`}
          >
            Certificates ({myCertificates.length})
          </button>
        </div>

        {/* CONTENT */}
        {loadingData ? (
          <div className="text-[#00d2ff] font-mono animate-pulse tracking-widest text-center py-12">
            [ Fetching_Personal_Records... ]
          </div>
        ) : (
          <div>

            {/* MISSIONS TAB */}
            {activeTab === "MISSIONS" && (
              <div className="space-y-4">
                {myMissions.length > 0 ? myMissions.map(mission => {
                  const event = eventDetails[mission.eventId];
                  return (
                    <div
                      key={mission.id}
                      onClick={() => event && setSelectedEvent(event)}
                      className={`flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0c10] border border-white/5 p-5 md:p-6 rounded-2xl transition-all group ${event ? "hover:border-[#00d2ff]/50 hover:bg-[#0d1420] cursor-pointer" : "cursor-default"}`}
                    >
                      <div className="flex items-center gap-4 min-w-0">

                        {/* Event poster thumbnail */}
                        {event?.posterUrl ? (
                          <img
                            src={event.posterUrl}
                            alt={event.title}
                            className="w-14 h-14 rounded-xl object-cover shrink-0 border border-white/10 group-hover:border-[#00d2ff]/40 transition-all"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                            <span className="text-[#00d2ff] text-lg">⚡</span>
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h3 className="text-sm md:text-base font-bold uppercase tracking-wider text-white group-hover:text-[#00d2ff] transition-colors truncate">
                              {mission.eventTitle}
                            </h3>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-widest shrink-0 ${
                              mission.attendanceStatus === "PRESENT"
                                ? "bg-[#50fa7b]/10 text-[#50fa7b] border border-[#50fa7b]/20"
                                : mission.attendanceStatus === "ABSENT"
                                ? "bg-[#ff5555]/10 text-[#ff5555] border border-[#ff5555]/20"
                                : "bg-[#00d2ff]/10 text-[#00d2ff] border border-[#00d2ff]/20"
                            }`}>
                              {mission.attendanceStatus || "Registered"}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                            {event?.date ? `Date: ${event.date}` : "Date: —"}
                            {event?.venue ? ` // Venue: ${event.venue}` : " // Venue: —"}
                          </p>
                          {event?.category && (
                            <span className="text-[8px] text-gray-600 uppercase tracking-widest mt-1 inline-block">
                              {event.category}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Arrow — only shown if event loaded */}
                      {event && (
                        <div className="shrink-0 text-gray-600 group-hover:text-[#00d2ff] transition-all group-hover:translate-x-1 hidden md:block">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                }) : (
                  <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                    <p className="text-gray-500 text-xs uppercase tracking-widest mb-4">No Events Registered.</p>
                    <Link href="/?scrollTo=operations" className="text-[#00d2ff] border border-[#00d2ff]/30 px-6 py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-[#00d2ff] hover:text-black transition-all">
                      Browse_Network_Events
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* CERTIFICATES TAB */}
            {activeTab === "CERTIFICATES" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myCertificates.length > 0 ? myCertificates.map(cert => (
                  <div key={cert.id} className="bg-[#0a0c10] border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-[#50fa7b]/30 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                      <svg className="w-24 h-24 text-[#50fa7b]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-1 group-hover:text-[#50fa7b] transition-colors pr-12 relative z-10">
                      {cert.eventTitle}
                    </h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-6 relative z-10">
                      Issued: {cert.issueDate}
                    </p>
                    <div className="flex items-center justify-between relative z-10">
                      <span className="text-[8px] text-gray-600 font-mono tracking-widest truncate max-w-[150px]">
                        HASH: {cert.certHash || cert.id}
                      </span>
                      <button
                        onClick={() => handleDownload(cert)}
                        disabled={downloadingId === cert.id}
                        className="text-[10px] uppercase font-bold tracking-widest text-black bg-[#50fa7b] px-4 py-2 rounded-lg hover:shadow-[0_0_15px_rgba(80,250,123,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {downloadingId === cert.id ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-black animate-pulse inline-block" />
                            Generating...
                          </>
                        ) : "↓ Download"}
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-1 md:col-span-2 text-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                    <p className="text-gray-500 text-xs uppercase tracking-widest">No Certificates Issued.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          EVENT DETAIL MODAL — matches OperationsSection style
      ══════════════════════════════════════════ */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 p-3 md:p-8 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-[1100px] h-[90vh] bg-[#0B111A] border border-[#2a2e3f] rounded-none overflow-hidden flex flex-col relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Title bar */}
            <div className="bg-[#0f172a] px-4 py-2.5 flex justify-between items-center border-b border-[#2a2e3f] shrink-0 z-20">
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5555]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#f1fa8c]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#50fa7b]" />
              </div>
              <div className="text-gray-400 text-[10px] font-mono tracking-widest uppercase truncate px-4">
                {selectedEvent.title.toLowerCase().replace(/\s+/g, "_")}_node.bin
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-white font-bold text-lg p-1 hover:bg-white/5">✕</button>
            </div>

            {/* Body */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

              {/* Poster */}
              <div className="lg:w-[45%] bg-black flex items-center justify-center border-b lg:border-b-0 lg:border-r border-[#2a2e3f] shrink-0 relative">
                {selectedEvent.posterUrl ? (
                  <img
                    src={selectedEvent.posterUrl}
                    alt={selectedEvent.title}
                    className="w-full h-full object-contain max-h-[35vh] lg:max-h-none p-4 md:p-0"
                  />
                ) : (
                  <div className="text-gray-600 font-mono tracking-widest">[ NO_VISUAL_FEED ]</div>
                )}
              </div>

              {/* Details */}
              <div className="lg:w-[55%] bg-[#0B111A] flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                  <div className="bg-[#00d2ff]/5 text-[#00d2ff] text-[10px] font-bold px-3 py-1 border border-[#00d2ff]/30 w-fit mb-6 uppercase tracking-widest">
                    [ {(selectedEvent.category || "EVENT").toUpperCase()} ]
                  </div>
                  <h2 className="text-white text-3xl md:text-5xl font-black mb-2 uppercase leading-tight">
                    {selectedEvent.title}
                  </h2>
                  <p className="text-[#50fa7b] text-xs font-bold mb-8 font-mono tracking-tighter">&gt; CHARUSAT_NODE_ACTIVE</p>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-[#121824] p-4 border border-white/5">
                      <div className="text-gray-500 text-[9px] uppercase font-bold tracking-widest mb-1">DATE</div>
                      <div className="text-white text-xs font-mono">{selectedEvent.date || "TBA"}</div>
                    </div>
                    <div className="bg-[#121824] p-4 border border-white/5">
                      <div className="text-gray-500 text-[9px] uppercase font-bold tracking-widest mb-1">TIME</div>
                      <div className="text-white text-xs font-mono">{selectedEvent.startTime || "TBA"}</div>
                    </div>
                  </div>

                  <div className="bg-[#121824] p-4 border border-white/5 mb-8">
                    <div className="text-gray-500 text-[9px] uppercase tracking-widest font-bold mb-1">LOCATION</div>
                    <div className="text-white text-xs font-mono">{selectedEvent.venue || "ENCRYPTED_NODE"}</div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-[#50fa7b] text-[10px] font-bold uppercase tracking-[0.3em] mb-4 font-mono">$&gt; MISSION_DESCRIPTION</h3>
                    <div className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                      {selectedEvent.description}
                    </div>
                  </div>
                </div>

                {/* Registration CTA */}
                <div className="p-6 md:px-10 md:pb-10 bg-[#0B111A] border-t border-white/5 shrink-0 z-10">
                  <Link
                    href={`/register/${selectedEvent.id}`}
                    className="block w-full text-center py-4 font-black font-mono uppercase tracking-[0.2em] transition-all text-xs bg-[#50fa7b] hover:bg-white text-black shadow-[0_0_30px_rgba(80,250,123,0.3)]"
                  >
                    INITIALIZE_REGISTRATION ↗
                  </Link>
                </div>
              </div>
            </div>

            {/* Footer bar */}
            <div className="bg-[#0f172a] px-5 py-2 flex justify-between items-center border-t border-[#2a2e3f] shrink-0 z-20">
              <div className="text-[#50fa7b] text-[9px] tracking-widest uppercase font-bold animate-pulse">[ SECURE_CONNECTION_STABLE ]</div>
              <div className="text-gray-500 text-[9px] uppercase font-bold tracking-widest">PORT: 8080</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}