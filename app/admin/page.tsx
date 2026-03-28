"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { auth, db } from "@/lib/firebase"; 
import { signOut as firebaseSignOut } from "firebase/auth";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react"; 
// 🚀 ADDED updateDoc
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot, query, orderBy } from "firebase/firestore";

const cyberStyles = `
  input[type="date"]::-webkit-calendar-picker-indicator,
  input[type="time"]::-webkit-calendar-picker-indicator {
    filter: invert(72%) sepia(95%) saturate(1000%) hue-rotate(155deg) brightness(100%) contrast(105%) !important;
    cursor: pointer !important;
    opacity: 1 !important;
  }
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #00d2ff33; border-radius: 10px; }

  /* 🚀 Cursor Fix */
  input, select, textarea, button, a {
    cursor: pointer !important; 
  }
  input[type="text"], input[type="number"], textarea {
    cursor: text !important;
  }
`;

export default function AdminDashboard() {
  const { data: session } = useSession(); 

  const adminInputClass = "bg-black/60 border border-white/10 rounded-xl p-3 md:p-4 text-xs outline-none focus:border-[#00d2ff] w-full transition-all text-white font-mono";

  const [activeModal, setActiveModal] = useState<"EVENT" | "MEMBER" | null>(null);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  
  // 🚀 NEW: Track what we are editing
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newEvent, setNewEvent] = useState({
    title: "", date: "", startTime: "", venue: "", regLink: "", category: "Workshop", description: ""
  });

  // 🚀 ADDED: collegeId
  const [newMember, setNewMember] = useState({
    name: "", role: "", section: "Student", linkedin: "", hierarchy: 1, collegeId: ""
  });

  useEffect(() => {
    const qEvents = query(collection(db, "events"), orderBy("timestamp", "desc"));
    const unsubEvents = onSnapshot(qEvents, (s) => setEvents(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qTeam = query(collection(db, "team"), orderBy("hierarchy", "asc"));
    const unsubTeam = onSnapshot(qTeam, (s) => setTeamMembers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubEvents(); unsubTeam(); };
  }, []);

  const handleAdminLogout = async () => {
    if (confirm("TERMINATE_ADMIN_SESSION?")) {
      await firebaseSignOut(auth);                        
      await nextAuthSignOut({ redirect: false }); 
      window.location.href = "/?bye=1";          
    }
  };

  const uploadToCloudinary = async (fileToUpload: File) => {
    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("upload_preset", "ml_default"); 
    const res = await fetch(`https://api.cloudinary.com/v1_1/dbzezvhhq/image/upload`, { method: "POST", body: formData });
    const data = await res.json();
    return data.secure_url;
  };

  const handleEventDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !editingId) return alert("MISSING_POSTER");
    setLoading(true);
    try {
      let posterUrl = previewUrl; 
      if (file) posterUrl = await uploadToCloudinary(file);

      const autoCountdownTarget = `${newEvent.date}T${newEvent.startTime || "00:00"}`;
      
      if (editingId) {
        await updateDoc(doc(db, "events", editingId), {
          ...newEvent, countdownTarget: autoCountdownTarget, posterUrl, category: newEvent.category.toLowerCase()
        });
        alert("MISSION_UPDATED");
      } else {
        await addDoc(collection(db, "events"), {
          ...newEvent, countdownTarget: autoCountdownTarget, posterUrl, category: newEvent.category.toLowerCase(), timestamp: serverTimestamp()
        });
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
        await updateDoc(doc(db, "team", editingId), {
          ...newMember, image: photoUrl
        });
        alert("OPERATIVE_UPDATED");
      } else {
        await addDoc(collection(db, "team"), {
          ...newMember, image: photoUrl, timestamp: serverTimestamp()
        });
        alert("MEMBER_RECRUITED");
      }
      closeModal();
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  // 🚀 NEW: Open Edit Modal with Data
  const openEditModal = (item: any, type: "EVENT" | "MEMBER") => {
    setEditingId(item.id);
    setActiveModal(type);
    if (type === "EVENT") {
      setNewEvent({ title: item.title, date: item.date, startTime: item.startTime, venue: item.venue, regLink: item.regLink, category: item.category, description: item.description });
      setPreviewUrl(item.posterUrl);
    } else {
      setNewMember({ name: item.name, role: item.role, section: item.section, linkedin: item.linkedin, hierarchy: item.hierarchy, collegeId: item.collegeId || "" });
      setPreviewUrl(item.image);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setFile(null);
    setPreviewUrl(null);
    setEditingId(null);
    setNewEvent({ title: "", date: "", startTime: "", venue: "", regLink: "", category: "Workshop", description: "" });
    setNewMember({ name: "", role: "", section: "Student", linkedin: "", hierarchy: 1, collegeId: "" });
  };

  const emailPrefix = session?.user?.email?.split("@")[0] || "ADMIN";
  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(emailPrefix)}&background=0f111a&color=00d2ff&bold=true&size=64`;
  const avatarSrc = (!avatarError && session?.user?.image) ? session.user.image : fallbackAvatar;

  return (
    <div style={{ position: 'relative', zIndex: 10005, backgroundColor: '#05060a', minHeight: '100vh', pointerEvents: 'auto' }}>
      <style>{cyberStyles}</style>

      {/* ADMIN HEADER */}
      <header className="fixed top-0 left-0 w-full h-14 bg-[#0f111a] border-b border-[#2a2e3f] flex items-center justify-between px-4 md:px-6 z-[10006]">
        
        <div className="flex items-center gap-2">
          <Image src="/CFC.png" alt="CFC" width={26} height={26} />
          <div style={{ color: "#fff", fontWeight: 900, fontSize: '13px', letterSpacing: '0.5px' }}>
            <span className="hidden sm:inline">CODE_FOR_CAUSE </span>
            <span className="sm:hidden">CFC </span>
            <span style={{ color: '#00d2ff', opacity: 0.6 }}>$root</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 bg-black/50 pr-4 p-1 rounded-full border border-white/10">
            <img
              src={avatarSrc}
              alt="Admin"
              referrerPolicy="no-referrer"
              onError={() => setAvatarError(true)}
              className="w-7 h-7 rounded-full border border-[#00d2ff] object-cover"
            />
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              {emailPrefix}
            </span>
          </div>
          <img
            src={avatarSrc}
            alt="Admin"
            referrerPolicy="no-referrer"
            onError={() => setAvatarError(true)}
            className="sm:hidden w-7 h-7 rounded-full border-2 border-[#00d2ff] object-cover"
          />
          <button
            onClick={handleAdminLogout}
            className="text-[10px] text-[#ff5555] font-black uppercase font-mono border border-[#ff5555]/40 px-3 py-1.5 rounded-md hover:bg-[#ff5555] hover:text-black transition-all"
          >
            [ ROOT_EXIT ]
          </button>
        </div>
      </header>
      
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 mb-10 md:mb-16">
            <div className="lg:col-span-2 grid grid-cols-2 gap-3 md:gap-4">
              <button onClick={() => setActiveModal("EVENT")} className="p-5 md:p-8 bg-[#0B111A] border border-[#00d2ff]/30 rounded-2xl md:rounded-3xl hover:border-[#00d2ff] transition-all text-left group">
                <div className="text-[#00d2ff] mb-2 text-lg md:text-2xl font-bold uppercase group-hover:tracking-widest transition-all">Deploy Event</div>
                <p className="text-gray-500 text-[9px] uppercase tracking-widest">Update mission registry</p>
              </button>
              <button onClick={() => setActiveModal("MEMBER")} className="p-5 md:p-8 bg-[#0B111A] border border-[#50fa7b]/30 rounded-2xl md:rounded-3xl hover:border-[#50fa7b] transition-all text-left group">
                <div className="text-[#50fa7b] mb-2 text-lg md:text-2xl font-bold uppercase group-hover:tracking-widest transition-all">Recruit Member</div>
                <p className="text-gray-500 text-[9px] uppercase tracking-widest">Register personnel</p>
              </button>
            </div>
            <div className="bg-[#0B111A] border border-white/5 rounded-2xl p-5 md:p-8 flex flex-row lg:flex-col justify-around lg:justify-center gap-4">
              <div className="flex justify-between items-center gap-4">
                <span className="text-[10px] text-gray-500 font-bold uppercase">Nodes</span>
                <span className="text-xl text-[#00d2ff] font-black">{events.length}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-[10px] text-gray-500 font-bold uppercase">Operators</span>
                <span className="text-xl text-[#50fa7b] font-black">{teamMembers.length}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12 pb-12">
            <RegistryList title="Mission_Registry" items={events} onEdit={(item: any) => openEditModal(item, "EVENT")} onDel={(id:string) => deleteDoc(doc(db,"events",id))} color="#00d2ff" type="event" />
            <RegistryList title="Personnel_Registry" items={teamMembers} onEdit={(item: any) => openEditModal(item, "MEMBER")} onDel={(id:string) => deleteDoc(doc(db,"team",id))} color="#50fa7b" type="member" />
          </div>
        </div>

        {activeModal && (
          <div className="fixed inset-0 z-[20000] flex items-start md:items-center justify-center bg-black/95 backdrop-blur-md p-3 md:p-4 overflow-y-auto">
            <div className={`bg-[#0B111A] border w-full max-w-2xl rounded-2xl md:rounded-3xl p-5 md:p-8 my-4 md:my-auto shadow-2xl ${activeModal === 'EVENT' ? 'border-[#00d2ff]/40' : 'border-[#50fa7b]/40'}`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-black tracking-[0.2em] text-[10px] md:text-xs uppercase" style={{ color: activeModal === 'EVENT' ? '#00d2ff' : '#50fa7b' }}>
                  [ {editingId ? 'UPDATE_REGISTRY' : (activeModal === 'EVENT' ? 'INIT_MISSION_DEPLOYMENT' : 'INIT_PERSONNEL_RECRUITMENT')} ]
                </h2>
                <button onClick={closeModal} className="text-gray-500 hover:text-white text-lg">✕</button>
              </div>

              <form onSubmit={activeModal === 'EVENT' ? handleEventDeploy : handleMemberDeploy} className="space-y-4">
                <div className="relative border-2 border-dashed border-white/10 rounded-2xl p-2 text-center bg-black/40">
                  {previewUrl ? (
                    <img src={previewUrl} className={`w-full max-h-40 object-contain rounded-xl ${activeModal === 'MEMBER' ? 'h-24 w-24 md:h-32 md:w-32 mx-auto rounded-full object-cover' : ''}`} alt="Preview" />
                  ) : (
                    <div className="py-8 md:py-12 text-[10px] text-gray-500 uppercase font-bold tracking-widest underline underline-offset-4">Upload_Visual_Asset</div>
                  )}
                  <input type="file" required={!editingId} accept="image/*" onChange={(e)=>{
                    const f = e.target.files?.[0];
                    if(f) { setFile(f); setPreviewUrl(URL.createObjectURL(f)); }
                  }} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>

                {activeModal === 'EVENT' && (
                  <div className="space-y-3 font-mono">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input required placeholder="TITLE" value={newEvent.title} className={adminInputClass} onChange={(e)=>setNewEvent({...newEvent, title: e.target.value})} />
                      <select className={adminInputClass} value={newEvent.category} onChange={(e)=>setNewEvent({...newEvent, category: e.target.value})}>
                        <option value="Workshop">Workshop</option>
                        <option value="Hackathon">Hackathon</option>
                        <option value="Seminar">Seminar</option>
                        <option value="Coding">Coding</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] text-[#00d2ff] uppercase ml-2 font-bold tracking-widest">Date</label>
                        <input type="date" required value={newEvent.date} className={adminInputClass} onChange={(e)=>setNewEvent({...newEvent, date: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 uppercase ml-2 tracking-widest">Time</label>
                        <input type="time" value={newEvent.startTime} className={adminInputClass} onChange={(e)=>setNewEvent({...newEvent, startTime: e.target.value})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00d2ff] text-[10px] font-black pointer-events-none z-10">LINK:</span>
                        <input required placeholder="G-FORM_URL" value={newEvent.regLink} style={{ paddingLeft: "85px" }} className={adminInputClass} onChange={(e)=>setNewEvent({...newEvent, regLink: e.target.value})} />
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00d2ff] text-[10px] font-black pointer-events-none z-10">LOC:</span>
                        <input placeholder="VENUE_LOCATION" value={newEvent.venue} style={{ paddingLeft: "70px" }} className={adminInputClass} onChange={(e)=>setNewEvent({...newEvent, venue: e.target.value})} />
                      </div>
                    </div>
                    <textarea required rows={2} placeholder="MISSION_DESCRIPTION..." value={newEvent.description} className={adminInputClass} onChange={(e)=>setNewEvent({...newEvent, description: e.target.value})} />
                  </div>
                )}

                {activeModal === 'MEMBER' && (
                  <div className="space-y-3 font-mono">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input required placeholder="FULL_NAME" value={newMember.name} className={`${adminInputClass} md:col-span-2`} onChange={(e)=>setNewMember({...newMember, name: e.target.value})} />
                      {/* 🚀 ADDED COLLEGE ID INPUT */}
                      <input required placeholder="College ID" value={newMember.collegeId} className={adminInputClass} onChange={(e)=>setNewMember({...newMember, collegeId: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input required placeholder="ROLE (e.g. Lead)" value={newMember.role} className={adminInputClass} onChange={(e)=>setNewMember({...newMember, role: e.target.value})} />
                      <select className={`${adminInputClass} font-bold cursor-pointer`} value={newMember.section} onChange={(e)=>setNewMember({...newMember, section: e.target.value})}>
                        <option value="Student">Student</option>
                        <option value="Faculty">Faculty</option>
                        <option value="Leadership">Leadership</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <input type="number" placeholder="RANK" value={newMember.hierarchy} className={adminInputClass} onChange={(e)=>setNewMember({...newMember, hierarchy: parseInt(e.target.value)})} />
                      <div className="relative col-span-2">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#50fa7b] text-[10px] font-black tracking-widest pointer-events-none z-10">LI:</span>
                        <input required placeholder="LINKEDIN_URL" value={newMember.linkedin} style={{ paddingLeft: "85px" }} className={adminInputClass} onChange={(e)=>setNewMember({...newMember, linkedin: e.target.value})} />
                      </div>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={loading} className={`w-full text-black font-black p-4 rounded-2xl uppercase tracking-[0.2em] transition-all hover:bg-white active:scale-95 disabled:opacity-50 text-xs md:text-sm ${activeModal === 'EVENT' ? 'bg-[#00d2ff]' : 'bg-[#50fa7b]'}`}>
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

// 🚀 REGISTRY LIST WITH EDIT BUTTON
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
            <img src={type === 'event' ? item.posterUrl : item.image} className={`w-8 h-8 object-cover shrink-0 ${type === 'member' ? 'rounded-full' : 'rounded-md'}`} alt="Visual" />
            <div className="min-w-0">
              <h4 className="text-xs font-bold uppercase tracking-wider truncate">{type === 'event' ? item.title : item.name}</h4>
              {/* 🚀 Shows College ID in the list if available */}
              <p className="text-[9px] text-gray-500 uppercase">{type === 'event' ? item.category : (item.collegeId || item.section)}</p>
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