"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, addDoc } from "firebase/firestore";

interface EventNode {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  status: string;
  venue: string;
}

export default function EventsPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<EventNode[]>([]);
  const [categories, setCategories] = useState<string[]>(["ALL"]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  
  // Registration States
  const [selectedEvent, setSelectedEvent] = useState<EventNode | null>(null);
  const [certName, setCertName] = useState("");
  const [github, setGithub] = useState(""); // 🎯 Added GitHub state
  const [foodPref, setFoodPref] = useState("PREFER_VEG"); // 🎯 Added Food preference state
  const [isRegistering, setIsRegistering] = useState(false);

  // 🎯 Fetch Dynamic User Identity from Firestore for the form
  const [customName, setCustomName] = useState("");
  const [userCollegeId, setUserCollegeId] = useState("");

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (session?.user?.email) {
        const q = query(collection(db, "users"), where("email", "==", session.user.email.toLowerCase()));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setCustomName(data.displayName || data.fullName || "");
          setUserCollegeId(data.collegeId || "");
          setCertName(data.displayName || data.fullName || "");
        }
      }
    };
    fetchUserProfile();
  }, [session]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const eventsRef = collection(db, "events");
        
        const allSnapshot = await getDocs(eventsRef);
        const allData = allSnapshot.docs.map(doc => doc.data() as EventNode);
        
        const uniqueCats = Array.from(new Set(allData.map(e => e.category?.toUpperCase() || "OTHER")));
        setCategories(["ALL", ...uniqueCats]);

        const q = filter === "ALL" 
          ? query(eventsRef, orderBy("date", "asc")) 
          : query(eventsRef, where("category", "==", filter.toLowerCase()), orderBy("date", "asc"));
        
        const querySnapshot = await getDocs(q);
        setEvents(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EventNode[]);
        
      } catch (error) {
        console.error("REGISTRY_LOAD_ERROR:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filter]);

  const handleCommitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.email || !selectedEvent) return;
    setIsRegistering(true);

    try {
      const registrationsRef = collection(db, "registrations");
      
      await addDoc(registrationsRef, {
        userEmail: session.user.email.toLowerCase(),
        userName: customName || session.user.name,
        certificateName: certName.toUpperCase(),
        collegeId: userCollegeId,
        
        // 🎯 Custom Form Data (The "Google Form" replacement)
        githubHandle: github,
        dietaryPreference: foodPref,
        
        eventId: selectedEvent.id,
        eventTitle: selectedEvent.title,
        eventDate: selectedEvent.date,
        eventVenue: selectedEvent.venue || "TBA",
        
        status: "PENDING", 
        registeredAt: new Date().toISOString()
      });

      alert("MISSION_LOGGED: Your registration is confirmed in the database.");
      setSelectedEvent(null);
      setGithub(""); // Reset form
    } catch (error) {
      console.error("Database Write Error:", error);
      alert("SYSTEM_FAILURE: Registration failed.");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#050A14', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ color: '#fff', fontSize: '32px', fontWeight: 900, fontFamily: 'monospace' }}>
            [ SYSTEM_EVENTS_REGISTRY ]
          </h1>
          <p style={{ color: '#8b949e', marginTop: '8px', fontSize: '14px' }}>
            Displaying active operations within the CHARUSAT network.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '40px', overflowX: 'auto', paddingBottom: '10px' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: '10px 22px',
                backgroundColor: filter === cat ? 'rgba(80, 250, 123, 0.1)' : '#0B111A',
                border: `1px solid ${filter === cat ? '#50fa7b' : '#2a2e3f'}`,
                color: filter === cat ? '#50fa7b' : '#8b949e',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: 'monospace',
                transition: '0.3s'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ color: '#50fa7b', fontFamily: 'monospace' }}>SCANNING_FREQUENCY...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {events.length > 0 ? events.map((event) => (
              <div key={event.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <span style={tagStyle}>{event.category?.toUpperCase() || "EVENT"}</span>
                  <span style={{ color: '#50fa7b', fontSize: '10px', fontWeight: 'bold' }}>
                    ● {event.status?.toUpperCase() || "ACTIVE"}
                  </span>
                </div>
                
                <h3 style={{ color: '#fff', fontSize: '20px', marginBottom: '12px', fontWeight: 'bold' }}>
                  {event.title}
                </h3>
                
                <p style={{ color: '#8b949e', fontSize: '13px', lineHeight: '1.6', marginBottom: '24px', minHeight: '60px' }}>
                  {event.description}
                </p>

                <div style={{ borderTop: '1px solid #2a2e3f', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: '#444', fontSize: '9px', fontWeight: 'bold' }}>SCHEDULED_DATE</span>
                    <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{event.date}</span>
                  </div>
                  <button 
                    onClick={() => {
                      if (!session) return alert("AUTH_REQUIRED: Please sign in to join missions.");
                      setSelectedEvent(event);
                    }}
                    style={actionBtn}
                  >
                    ENROLL_NOW_&gt;
                  </button>
                </div>
              </div>
            )) : (
              <div style={{ color: '#ff5555', fontFamily: 'monospace', gridColumn: '1/-1', textAlign: 'center', padding: '50px', border: '1px dashed #ff555533' }}>
                [ ERROR: NO_ACTIVE_NODES_FOUND_IN_THIS_SECTOR ]
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🚨 CUSTOM REGISTRATION MODAL (Google Form Replacement) */}
      {selectedEvent && (
        <div style={modalOverlay}>
          <div style={modalCard}>
             <h2 style={{ color: '#00d2ff', fontFamily: 'monospace', fontWeight: 900, fontSize: '18px', marginBottom: '20px' }}>
               [ MISSION_ENROLLMENT: {selectedEvent.title} ]
             </h2>
             
             <form onSubmit={handleCommitRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                   <div>
                      <label style={modalLabel}>IDENTITY_EMAIL</label>
                      <input type="text" disabled value={session?.user?.email || ""} style={{ ...modalInput, opacity: 0.5, cursor: 'not-allowed' }} />
                   </div>
                   <div>
                      <label style={modalLabel}>OPERATIVE_NAME</label>
                      <input type="text" disabled value={customName} style={{ ...modalInput, opacity: 0.5, cursor: 'not-allowed' }} />
                   </div>
                </div>

                <div>
                   <label style={modalLabel}>CERTIFICATE_NAME (AS IT SHOULD APPEAR)</label>
                   <input 
                     type="text" 
                     required 
                     value={certName}
                     onChange={(e) => setCertName(e.target.value)}
                     style={modalInput}
                     placeholder="Full Legal Name"
                   />
                </div>

                {/* 🎯 CUSTOM QUESTIONS */}
                <div style={{ display: 'flex', gap: '15px' }}>
                   <div style={{ flex: 1 }}>
                      <label style={modalLabel}>GITHUB_HANDLE</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. kavya-dabhi" 
                        value={github}
                        onChange={(e) => setGithub(e.target.value)}
                        style={modalInput} 
                      />
                   </div>
                   <div style={{ flex: 1 }}>
                      <label style={modalLabel}>DIETARY_PREFERENCE</label>
                      <select 
                        value={foodPref}
                        onChange={(e) => setFoodPref(e.target.value)}
                        style={modalInput}
                      >
                        <option value="PREFER_VEG">PREFER_VEG</option>
                        <option value="PREFER_NON_VEG">PREFER_NON_VEG</option>
                      </select>
                   </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                   <button 
                     type="button" 
                     onClick={() => setSelectedEvent(null)}
                     style={{ ...secondaryBtn, flex: 1 }}
                   >
                     ABORT
                   </button>
                   <button 
                     type="submit" 
                     disabled={isRegistering}
                     style={{ ...primaryBtn, flex: 2 }}
                   >
                     {isRegistering ? "COMMITTING..." : "CONFIRM_REGISTRATION →"}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </main>
  );
}

// --- STYLES ---
const cardStyle = { backgroundColor: '#0B111A', border: '1px solid #2a2e3f', borderRadius: '20px', padding: '30px', transition: 'all 0.3s ease' };
const tagStyle = { fontSize: '9px', fontWeight: 'bold', color: '#50fa7b', backgroundColor: 'rgba(80, 250, 123, 0.05)', padding: '5px 10px', borderRadius: '6px', border: '1px solid rgba(80, 250, 123, 0.2)', letterSpacing: '1px' };
const actionBtn = { backgroundColor: 'transparent', border: 'none', color: '#50fa7b', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace' };

const modalOverlay = { position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const modalCard = { width: '100%', maxWidth: '550px', backgroundColor: '#0B111A', border: '1px solid rgba(0,210,255,0.2)', borderRadius: '24px', padding: '40px' };
const modalLabel = { color: '#8b949e', fontSize: '9px', display: 'block', marginBottom: '8px', fontWeight: 'bold', fontFamily: 'monospace' };
const modalInput = { width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid #2a2e3f', borderRadius: '12px', padding: '14px', color: '#fff', fontSize: '13px', outline: 'none', fontFamily: 'monospace' };

const primaryBtn = { backgroundColor: '#50fa7b', color: '#000', border: 'none', borderRadius: '12px', padding: '16px', fontWeight: 900, cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' };
const secondaryBtn = { backgroundColor: 'transparent', color: '#8b949e', border: '1px solid #2a2e3f', borderRadius: '12px', padding: '16px', fontWeight: 900, cursor: 'pointer', fontFamily: 'monospace', fontSize: '12px' };