"use client";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase"; // Ensure 'auth' is exported from your firebase config
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, addDoc, deleteDoc, doc, serverTimestamp, onSnapshot, query, orderBy } from "firebase/firestore";

const cyberStyles = `
  input[type="date"]::-webkit-calendar-picker-indicator,
  input[type="time"]::-webkit-calendar-picker-indicator {
    filter: invert(72%) sepia(95%) saturate(1000%) hue-rotate(155deg) brightness(100%) contrast(105%) !important;
    cursor: pointer;
    opacity: 1 !important;
    display: block !important;
    width: 20px;
    height: 20px;
  }
  select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2300d2ff'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 1rem center;
    background-size: 1.1em;
    color-scheme: dark;
  }
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #00d2ff33; border-radius: 10px; }
`;

export default function AdminDashboard() {
  // 🛡️ NATIVE FIREBASE AUTH STATE
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      alert("AUTHENTICATION_FAILED");
    }
  };

  const [activeModal, setActiveModal] = useState<"EVENT" | "MEMBER" | null>(null);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [newEvent, setNewEvent] = useState({
    title: "", date: "", startTime: "", venue: "", regLink: "", category: "Workshop", description: ""
  });

  const [newMember, setNewMember] = useState({
    name: "", role: "", section: "Student", linkedin: "", hierarchy: 1
  });

  // Fetch data ONLY if the user is authenticated
  useEffect(() => {
    if (!user) return; 

    const qEvents = query(collection(db, "events"), orderBy("timestamp", "desc"));
    const unsubEvents = onSnapshot(qEvents, (s) => setEvents(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const qTeam = query(collection(db, "team"), orderBy("hierarchy", "asc"));
    const unsubTeam = onSnapshot(qTeam, (s) => setTeamMembers(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubEvents(); unsubTeam(); };
  }, [user]);

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
    if (!file) return alert("MISSING_VISUAL_ASSET");
    setLoading(true);
    try {
      const posterUrl = await uploadToCloudinary(file);
      const autoCountdownTarget = `${newEvent.date}T${newEvent.startTime || "00:00"}`;

      await addDoc(collection(db, "events"), {
        ...newEvent,
        countdownTarget: autoCountdownTarget,
        posterUrl,
        category: newEvent.category.toLowerCase(),
        timestamp: serverTimestamp()
      });
      alert("MISSION_DEPLOYED_SUCCESSFULLY");
      closeModal();
    } catch (err) { 
      alert("PERMISSION_DENIED: Check Firestore Rules"); 
      console.error(err);
    }
    setLoading(false);
  };

  const handleMemberDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("MISSING_OPERATIVE_PHOTO");
    setLoading(true);
    try {
      const photoUrl = await uploadToCloudinary(file);
      await addDoc(collection(db, "team"), {
        ...newMember,
        image: photoUrl,
        timestamp: serverTimestamp()
      });
      alert("OPERATIVE_REGISTERED");
      closeModal();
    } catch (err) { 
      alert("PERMISSION_DENIED: Check Firestore Rules"); 
      console.error(err);
    }
    setLoading(false);
  };

  const closeModal = () => {
    setActiveModal(null);
    setFile(null);
    setPreviewUrl(null);
    setNewEvent({ title: "", date: "", startTime: "", venue: "", regLink: "", category: "Workshop", description: "" });
    setNewMember({ name: "", role: "", section: "Student", linkedin: "", hierarchy: 1 });
  };

  // 🔒 TERMINAL LOGIN SCREEN FOR UNAUTHENTICATED USERS
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#05060a] text-[#00d2ff] flex items-center justify-center font-mono tracking-widest text-xs uppercase animate-pulse">
        Initializing_Terminal_Access...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#05060a] flex flex-col items-center justify-center font-mono text-white selection:bg-[#50fa7b] selection:text-black px-4">
        <div className="border-l-4 border-[#00d2ff] pl-4 md:pl-6 mb-8 max-w-md w-full">
          <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">System <span className="text-[#00d2ff]">Locked</span></h1>
          <p className="text-gray-500 mt-2 text-[10px] md:text-xs tracking-widest uppercase">Awaiting valid credentials</p>
        </div>
        <button onClick={handleLogin} className="w-full max-w-md p-4 md:p-5 border border-[#50fa7b]/30 bg-[#0B111A] text-[#50fa7b] hover:border-[#50fa7b] hover:bg-white hover:text-black transition-all rounded-2xl font-bold tracking-[0.2em] uppercase text-[10px] md:text-xs text-center">
          Initialize Auth Protocol →
        </button>
      </div>
    );
  }

  // 🟢 MAIN DASHBOARD FOR AUTHENTICATED USERS
  return (
    <main className="min-h-screen bg-[#05060a] pt-16 md:pt-24 px-4 md:px-8 font-mono text-white selection:bg-[#50fa7b] selection:text-black">
      <style>{cyberStyles}</style>
      
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start border-l-4 border-[#50fa7b] pl-4 md:pl-6 mb-8 md:mb-12 font-mono">
          <div>
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">Terminal <span className="text-[#50fa7b]">Admin</span></h1>
            <p className="text-gray-500 mt-2 text-[10px] md:text-xs tracking-widest uppercase break-all">ID: {user.email} | ACCESS: GRANTED</p>
          </div>
          <button onClick={() => signOut(auth)} className="text-[10px] text-[#ff5555] border border-[#ff5555]/30 p-2 rounded-lg hover:bg-[#ff5555] hover:text-black transition-all uppercase tracking-widest font-bold">
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8 mb-10 md:mb-16">
          <div className="lg:col-span-2 grid grid-cols-2 gap-3 md:gap-4">
            <button onClick={() => setActiveModal("EVENT")} className="p-5 md:p-8 bg-[#0B111A] border border-[#00d2ff]/30 rounded-2xl md:rounded-3xl hover:border-[#00d2ff] transition-all text-left group">
              <div className="text-[#00d2ff] mb-2 text-lg md:text-2xl font-bold uppercase tracking-tighter">Deploy Event</div>
              <p className="text-gray-500 text-[9px] md:text-[10px] uppercase tracking-widest font-mono">Upload Missions & Links</p>
            </button>
            <button onClick={() => setActiveModal("MEMBER")} className="p-5 md:p-8 bg-[#0B111A] border border-[#50fa7b]/30 rounded-2xl md:rounded-3xl hover:border-[#50fa7b] transition-all text-left group">
              <div className="text-[#50fa7b] mb-2 text-lg md:text-2xl font-bold uppercase tracking-tighter">Recruit Member</div>
              <p className="text-gray-500 text-[9px] md:text-[10px] uppercase tracking-widest font-mono">Register Personnel</p>
            </button>
          </div>
          <div className="bg-[#0B111A] border border-white/5 rounded-2xl md:rounded-3xl p-5 md:p-8 flex flex-row lg:flex-col justify-around lg:justify-center gap-4">
            <div className="flex justify-between items-center gap-4"><span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest font-mono">Nodes</span><span className="text-xl text-[#00d2ff] font-black">{events.length}</span></div>
            <div className="hidden lg:block h-px bg-white/5" />
            <div className="flex justify-between items-center gap-4"><span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest font-mono">Operatives</span><span className="text-xl text-[#50fa7b] font-black">{teamMembers.length}</span></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12 pb-12">
          <RegistryList title="Mission_Registry" items={events} onDel={(id:string) => deleteDoc(doc(db,"events",id))} color="#00d2ff" type="event" />
          <RegistryList title="Personnel_Registry" items={teamMembers} onDel={(id:string) => deleteDoc(doc(db,"team",id))} color="#50fa7b" type="member" />
        </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-[10000] flex items-start md:items-center justify-center bg-black/95 backdrop-blur-md p-3 md:p-4 overflow-y-auto">
          <div className={`bg-[#0B111A] border w-full max-w-2xl rounded-2xl md:rounded-3xl p-5 md:p-8 my-4 md:my-auto shadow-[0_0_80px_rgba(0,210,255,0.1)] ${activeModal === 'EVENT' ? 'border-[#00d2ff]/40' : 'border-[#50fa7b]/40'}`}>
            <div className="flex justify-between items-center mb-6 md:mb-8">
              <h2 className="font-black tracking-[0.2em] md:tracking-[0.3em] text-[10px] md:text-xs uppercase font-mono" style={{ color: activeModal === 'EVENT' ? '#00d2ff' : '#50fa7b' }}>[ {activeModal === 'EVENT' ? 'INIT_MISSION_DEPLOYMENT' : 'INIT_PERSONNEL_RECRUITMENT'} ]</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-white text-lg">✕</button>
            </div>

            <form onSubmit={activeModal === 'EVENT' ? handleEventDeploy : handleMemberDeploy} className="space-y-4 md:space-y-6">
              <div className="relative group border-2 border-dashed border-white/10 rounded-2xl p-2 text-center bg-black/40">
                {previewUrl ? (
                  <img src={previewUrl} className={`w-full max-h-40 object-contain rounded-xl ${activeModal === 'MEMBER' ? 'h-24 w-24 md:h-32 md:w-32 mx-auto rounded-full object-cover' : ''}`} />
                ) : (
                  <div className="py-8 md:py-12 text-[10px] text-gray-500 uppercase font-bold tracking-widest underline underline-offset-4 font-mono">Upload_Visual_Asset</div>
                )}
                <input type="file" required accept="image/*" onChange={(e)=>{
                  const f = e.target.files?.[0];
                  if(f) { setFile(f); setPreviewUrl(URL.createObjectURL(f)); }
                }} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>

              {activeModal === 'EVENT' && (
                <div className="space-y-3 md:space-y-4 font-mono">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <input required placeholder="TITLE" className="bg-black/60 border border-white/10 rounded-xl p-3 md:p-4 text-xs outline-none focus:border-[#00d2ff] w-full" onChange={(e)=>setNewEvent({...newEvent, title: e.target.value})} />
                    <select className="bg-black/60 border border-white/10 rounded-xl p-3 md:p-4 text-xs outline-none focus:border-[#00d2ff] w-full" onChange={(e)=>setNewEvent({...newEvent, category: e.target.value})}>
                      <option value="Workshop">Workshop</option><option value="Hackathon">Hackathon</option><option value="Seminar">Seminar</option><option value="Coding">Coding</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1"><label className="text-[9px] text-[#00d2ff] uppercase ml-2 font-bold tracking-widest">Event_Date</label>
                    <input type="date" required className="w-full bg-black/60 border border-white/10 rounded-xl p-3 md:p-4 text-xs outline-none" onChange={(e)=>setNewEvent({...newEvent, date: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-[9px] text-gray-500 uppercase ml-2 tracking-widest">Start_Time</label>
                    <input type="time" className="w-full bg-black/60 border border-white/10 rounded-xl p-3 md:p-4 text-xs outline-none" onChange={(e)=>setNewEvent({...newEvent, startTime: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00d2ff] text-[10px] font-bold">LINK:</span><input required placeholder="G-FORM_URL" className="w-full bg-black/60 border border-white/10 rounded-xl p-3 md:p-4 pl-14 text-xs outline-none focus:border-[#00d2ff]" onChange={(e)=>setNewEvent({...newEvent, regLink: e.target.value})} /></div>
                    <input placeholder="VENUE_LOCATION" className="w-full bg-black/60 border border-white/10 rounded-xl p-3 md:p-4 text-xs outline-none focus:border-[#00d2ff]" onChange={(e)=>setNewEvent({...newEvent, venue: e.target.value})} />
                  </div>
                  <textarea required rows={2} placeholder="MISSION_DESCRIPTION..." className="w-full bg-black/60 border border-white/10 rounded-xl p-3 md:p-4 text-xs outline-none focus:border-[#00d2ff]" onChange={(e)=>setNewEvent({...newEvent, description: e.target.value})} />
                </div>
              )}

              {activeModal === 'MEMBER' && (
                <div className="space-y-3 md:space-y-4 font-mono">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <input required placeholder="FULL_NAME" className="bg-black/60 border border-white/10 rounded-xl p-3 md:p-4 text-xs outline-none focus:border-[#50fa7b] w-full" onChange={(e)=>setNewMember({...newMember, name: e.target.value})} />
                    <input required placeholder="ROLE (e.g. Lead)" className="bg-black/60 border border-white/10 rounded-xl p-3 md:p-4 text-xs outline-none focus:border-[#50fa7b] w-full" onChange={(e)=>setNewMember({...newMember, role: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <select className="bg-black/60 border border-white/10 rounded-xl p-3 md:p-4 text-xs outline-none focus:border-[#50fa7b] uppercase font-bold w-full" onChange={(e)=>setNewMember({...newMember, section: e.target.value})}>
                      <option value="Student">Student</option><option value="Faculty">Faculty</option><option value="Leadership">Leadership</option>
                    </select>
                    <input type="number" placeholder="RANK (1=TOP)" className="bg-black/60 border border-white/10 rounded-xl p-3 md:p-4 text-xs outline-none focus:border-[#50fa7b] w-full" onChange={(e)=>setNewMember({...newMember, hierarchy: parseInt(e.target.value)})} />
                  </div>
                  <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#50fa7b] text-[10px] font-bold">LI:</span><input required placeholder="LINKEDIN_URL" className="w-full bg-black/60 border border-white/10 rounded-xl p-3 md:p-4 pl-12 text-xs outline-none focus:border-[#50fa7b]" onChange={(e)=>setNewMember({...newMember, linkedin: e.target.value})} /></div>
                </div>
              )}

              <button type="submit" disabled={loading} className={`w-full text-black font-black p-4 md:p-5 rounded-2xl uppercase tracking-[0.2em] md:tracking-[0.3em] transition-all hover:bg-white active:scale-95 disabled:opacity-50 font-mono text-xs md:text-sm ${activeModal === 'EVENT' ? 'bg-[#00d2ff]' : 'bg-[#50fa7b]'}`}>
                {loading ? "COMMITTING..." : "EXECUTE_DEPLOYMENT →"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

const RegistryList = ({ title, items, onDel, color, type }: any) => (
  <div className="bg-[#0a0c10] border border-white/5 rounded-2xl md:rounded-3xl p-4 md:p-6 font-mono">
    <h3 className="text-xs font-bold uppercase tracking-[0.3em] mb-4 md:mb-6 flex items-center gap-2" style={{ color }}><span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: color }} />{title}</h3>
    <div className="space-y-3 max-h-72 md:max-h-80 overflow-y-auto pr-1 md:pr-2 custom-scrollbar">
      {items.map((item: any) => (
        <div key={item.id} className="flex justify-between items-center bg-white/5 p-3 md:p-4 rounded-xl border border-white/5 group hover:border-white/20 transition-all gap-2">
          <div className="flex items-center gap-3 min-w-0"><img src={type === 'event' ? item.posterUrl : item.image} className={`w-8 h-8 object-cover shrink-0 ${type === 'member' ? 'rounded-full' : 'rounded-md'}`} /><div className="min-w-0"><h4 className="text-xs font-bold uppercase tracking-wider truncate">{type === 'event' ? item.title : item.name}</h4><p className="text-[9px] text-gray-500 uppercase">{type === 'event' ? item.category : item.section}</p></div></div>
          <button onClick={() => confirm("TERMINATE_NODE?") && onDel(item.id)} className="text-[#ff5555] text-[10px] font-bold uppercase opacity-30 hover:opacity-100 transition-opacity shrink-0">Del</button>
        </div>
      ))}
    </div>
  </div>
);