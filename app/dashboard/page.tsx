"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc } from "firebase/firestore";
import { GoogleAuthProvider, linkWithPopup } from "firebase/auth";
import { downloadCertificate } from "@/lib/downloadCertificate"; // ✅ NEW

const cyberStyles = `
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #00d2ff33; border-radius: 10px; }
`;

export default function UserDashboard() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<"MISSIONS" | "CERTIFICATES">("MISSIONS");

  const [myMissions, setMyMissions] = useState<any[]>([]);
  const [myCertificates, setMyCertificates] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null); // ✅ tracks which cert is generating

  const [customName, setCustomName] = useState<string | null>(null);
  const [firestorePhoto, setFirestorePhoto] = useState<string | null>(null);

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
    const unsubMissions = onSnapshot(qMissions, snapshot => {
      setMyMissions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
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

  // ✅ Certificate download — uses canvas to overlay name on template image
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
            className={`pb-4 px-2 text-xs md:text-sm uppercase tracking-widest font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'MISSIONS' ? 'border-[#00d2ff] text-[#00d2ff]' : 'border-transparent text-gray-600 hover:text-gray-300'}`}
          >
            My Events ({myMissions.length})
          </button>
          <button
            onClick={() => setActiveTab("CERTIFICATES")}
            className={`pb-4 px-2 text-xs md:text-sm uppercase tracking-widest font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'CERTIFICATES' ? 'border-[#50fa7b] text-[#50fa7b]' : 'border-transparent text-gray-600 hover:text-gray-300'}`}
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
          <div className="animate-fadeUp">

            {/* MISSIONS TAB */}
            {activeTab === "MISSIONS" && (
              <div className="space-y-4">
                {myMissions.length > 0 ? myMissions.map(mission => (
                  <div key={mission.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0c10] border border-white/5 p-5 md:p-6 rounded-2xl hover:border-[#00d2ff]/30 transition-all group">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-sm md:text-base font-bold uppercase tracking-wider text-white group-hover:text-[#00d2ff] transition-colors">{mission.eventTitle}</h3>
                        <span className="text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-widest bg-[#00d2ff]/10 text-[#00d2ff] border border-[#00d2ff]/20">
                          Registered
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                        Date: {mission.eventDate} // Venue: {mission.eventVenue}
                      </p>
                    </div>
                  </div>
                )) : (
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

                      {/* ✅ Working download button */}
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
    </div>
  );
}