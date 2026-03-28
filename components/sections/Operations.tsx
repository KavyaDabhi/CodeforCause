"use client";
import { useState, useEffect } from "react";
import Link from 'next/link';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import HomeTimer from "@/components/HomeTimer";

interface EventNode {
  id: string;
  title: string;
  category: string;
  description: string;
  date: string;
  startTime: string;
  countdownTarget?: string;
  venue: string;
  regLink: string;
  posterUrl?: string;
}

export default function OperationsSection() {
  const [allEvents, setAllEvents] = useState<EventNode[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventNode[]>([]);
  const [categories, setCategories] = useState<string[]>(["ALL"]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventNode | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "events"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EventNode[];
      setAllEvents(fetched);
      const uniqueCats = Array.from(new Set(fetched.map(e => (e.category || "UNCATEGORIZED").toUpperCase())));
      setCategories(["ALL", ...uniqueCats]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (filter === "ALL") {
      setFilteredEvents(allEvents);
    } else {
      setFilteredEvents(allEvents.filter(e => e.category?.toUpperCase() === filter.toUpperCase()));
    }
  }, [filter, allEvents]);

  useEffect(() => {
    document.body.style.overflow = selectedEvent ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedEvent]);

  const latestEvent = allEvents.length > 0 ? allEvents[0] : null;

  return (
    <section id="operations" className="w-full pt-20 md:pt-32 pb-24 bg-[#03060a] min-h-screen font-mono text-white selection:bg-[#00d2ff] selection:text-black">
      
      {/* Header - FIXED SCALING */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 mb-10 md:mb-12 text-center md:text-left">
       <h1 
  className="font-black mb-4 uppercase text-[#00d2ff] drop-shadow-[0_0_15px_rgba(0,210,255,0.3)] leading-tight text-center md:text-left"
  style={{
    // This clamp ensures it scales perfectly between 18px and 48px
    fontSize: "clamp(18px, 4.5vw, 48px)",
    // Reduced tracking on mobile to save horizontal space
    letterSpacing: "0.1em",
    // This prevents the text from ever wider than the padding-protected screen
    maxWidth: "100%",
    wordBreak: "break-word"
  }}
>
  [ CFC_OPERATIONS_REGISTRY ]
</h1>
        <p className="text-gray-400 text-[10px] md:text-sm">
          <span className="text-[#50fa7b] animate-pulse">●</span> Active Code For Cause network nodes.
        </p>
      </div>

      {/* TOP STOPWATCH / WARNING SECTION */}
      <div className="w-full mb-12 md:mb-16">
        {loading ? (
          <div className="py-10 animate-pulse text-[#00d2ff] font-bold tracking-widest text-center uppercase">Scanning_Network...</div>
        ) : allEvents.length === 0 ? (
          <div className="max-w-7xl mx-auto py-16 md:py-24 px-4 md:px-8 border border-[#ff5555]/30 bg-[#ff5555]/5 rounded-none text-center animate-fadeUp">
            <div className="mb-6 flex justify-center gap-3">
              <div className="w-2 h-2 bg-[#ff5555] rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-[#ff5555] rounded-full animate-pulse delay-75" />
            </div>
            <h2 className="text-[#ff5555] font-black text-base md:text-2xl tracking-[0.2em] md:tracking-[0.4em] uppercase mb-4">
              [ !! NO_UPCOMING_EVENTS !! ]
            </h2>
            <p className="text-gray-500 text-xs font-mono tracking-widest uppercase">
              System_Status: Standing_By_For_Admin_Deployment
            </p>
          </div>
        ) : latestEvent?.countdownTarget ? (
          <div className="w-full mt-8 md:mt-16 flex justify-center px-4">
            <div className="w-full max-w-6xl min-h-[80px] md:h-32 bg-[#05080c] border-y border-[#00d2ff]/10 flex flex-col md:flex-row items-start md:items-center justify-between px-5 md:px-12 py-4 md:py-0 transition-all shadow-[0_0_50px_rgba(0,210,255,0.02)] relative overflow-hidden gap-4 md:gap-0">
              <div className="flex flex-col justify-center gap-1">
                <HomeTimer target={latestEvent.countdownTarget} />
                <span className="text-[#00d2ff]/40 text-[9px] font-mono tracking-[0.3em] uppercase">
                  ACTIVE_NODE: {latestEvent.title}
                </span>
              </div>
              {latestEvent.regLink && (
                <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto">
                  <div className="hidden md:block h-12 w-[1px] bg-[#00d2ff]/10" />
                  <Link 
                    href={latestEvent.regLink} 
                    target="_blank" 
                    className="w-full md:w-auto text-center px-5 md:px-6 py-3 border border-[#00d2ff]/30 text-[#00d2ff] hover:bg-[#00d2ff] hover:text-black text-[10px] md:text-xs font-black transition-all duration-300 font-mono uppercase tracking-[0.2em] hover:shadow-[0_0_20px_rgba(0,210,255,0.4)]"
                  >
                    JOIN_OPERATION _
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Categories & Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {allEvents.length > 0 && (
          <div className="flex flex-nowrap overflow-x-auto gap-3 mb-8 md:mb-12 pb-4 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 md:px-6 py-2 rounded-md text-xs font-bold whitespace-nowrap border transition-all uppercase tracking-widest ${
                  filter === cat
                    ? 'bg-[#00d2ff]/10 border-[#00d2ff] text-[#00d2ff] shadow-[0_0_15px_rgba(0,210,255,0.2)]'
                    : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {!loading && filteredEvents.length > 0 && (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fadeUp">
    {filteredEvents.map((event) => (
      <div 
        key={event.id} 
        onClick={() => setSelectedEvent(event)}
        // REMOVED fixed height for mobile, kept it for desktop md:h-[580px]
        className="w-full md:h-[580px] bg-[#0a0c10] border-2 border-[#00d2ff]/30 rounded-none overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-[0_0_40px_rgba(0,210,255,0.15)] cursor-pointer relative"
      >
        {/* OS Header */}
        <div className="bg-[#0f172a] px-3 py-2 flex justify-between items-center border-b border-[#00d2ff]/30 shrink-0">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5555]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#f1fa8c]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#50fa7b]" />
          </div>
          <div className="text-gray-400 text-[9px] font-mono tracking-widest uppercase truncate px-2">
            {event.title.toLowerCase().replace(/\s+/g, '_')}.exe
          </div>
          <div className="text-gray-500 font-bold text-xs">✕</div>
        </div>

        {/* IMAGE CONTAINER - FIXED RATIO FOR PERFECT POSTER PRINT */}
        <div className="relative w-full aspect-[3/4] sm:aspect-[4/5] md:flex-grow bg-[#050A14] overflow-hidden">
          {event.posterUrl ? (
            <img 
              src={event.posterUrl} 
              // Changed object-fill to object-cover to prevent stretching
              className="w-full h-full object-cover opacity-90 md:grayscale md:group-hover:grayscale-0 transition-all duration-500 md:group-hover:scale-105" 
              alt={event.title} 
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[#00d2ff]/30 text-[10px] uppercase tracking-widest font-mono">
              [ NO_VISUAL ]
            </div>
          )}
          
          {/* Bottom Info Overlay */}
          <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-[#0a0c10] via-[#0a0c10]/90 to-transparent pt-16">
            <div className="relative h-10 w-full flex items-center justify-center">
              
              {/* Category Badge */}
              <div className="md:group-hover:opacity-0 md:group-hover:scale-90 transition-all duration-300">
                <div className="px-3 py-1.5 border border-[#00d2ff]/40 bg-[#00d2ff]/10 text-[#00d2ff] font-mono font-bold text-[10px] uppercase tracking-[0.15em]">
                  [ {event.category.toUpperCase()} ]
                </div>
              </div>

              {/* Action Prompt - Desktop Only */}
              <div className="absolute inset-0 hidden md:flex items-center justify-center opacity-0 scale-110 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                <div className="w-full py-2.5 bg-[#00d2ff] text-black font-black text-[10px] text-center uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(0,210,255,0.4)]">
                  EXECUTE_DETAILS _
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Status Bar */}
        <div className="bg-[#0f172a] px-4 py-2 flex justify-between items-center border-t border-[#00d2ff]/30 shrink-0">
          <div className="text-[#50fa7b] text-[9px] font-mono tracking-widest uppercase font-bold animate-pulse">[ LISTENING ]</div>
          <div className="text-gray-500 text-[9px] font-mono uppercase font-bold">PORT: 8080</div>
        </div>
      </div>
    ))}
  </div>
)}
      </div>


      {/* DETAIL MODAL - IMPROVED SCROLLING AND RATIOS */}
      {/* DETAIL MODAL - STATIC POSTER / SCROLLABLE INTEL */}
{selectedEvent && (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 p-3 md:p-8 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
    <div className="w-full max-w-[1100px] h-[90vh] bg-[#0B111A] border border-[#2a2e3f] rounded-none overflow-hidden flex flex-col relative animate-fadeUp" onClick={(e) => e.stopPropagation()}>
      
      {/* Modal OS Header */}
      <div className="bg-[#0f172a] px-4 py-2.5 flex justify-between items-center border-b border-[#2a2e3f] shrink-0 z-20">
        <div className="flex gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5555]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#f1fa8c]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#50fa7b]" />
        </div>
        <div className="text-gray-400 text-[10px] font-mono tracking-widest uppercase truncate px-4">
          {selectedEvent.title.toLowerCase().replace(/\s+/g, '_')}_node.bin
        </div>
        <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-white font-bold text-lg p-1 hover:bg-white/5">✕</button>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        
        {/* LEFT: STATIC POSTER (Fixed on Desktop) */}
        <div className="lg:w-[45%] bg-black flex items-center justify-center border-b lg:border-b-0 lg:border-r border-[#2a2e3f] shrink-0 bg-[url('/grid.png')] bg-repeat relative">
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

        {/* RIGHT: SCROLLABLE INTEL PANEL */}
        <div className="lg:w-[55%] bg-[#0B111A] flex flex-col h-full overflow-hidden">
          
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
            <div className="bg-[#00d2ff]/5 text-[#00d2ff] text-[10px] font-bold px-3 py-1 border border-[#00d2ff]/30 w-fit mb-6 uppercase tracking-widest">
              [ {selectedEvent.category.toUpperCase()} ]
            </div>
            
            <h2 className="text-white text-3xl md:text-5xl font-black mb-2 uppercase leading-tight">
              {selectedEvent.title}
            </h2>
            <p className="text-[#50fa7b] text-xs font-bold mb-8 font-mono tracking-tighter">&gt; CHARUSAT_NODE_ACTIVE</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#121824] p-4 border border-white/5">
                <div className="text-gray-500 text-[9px] uppercase font-bold tracking-widest mb-1">DATE</div>
                <div className="text-white text-xs font-mono">{selectedEvent.date}</div>
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

          {/* DOCKED REGISTRATION BUTTON */}
          <div className="p-6 md:px-10 md:pb-10 bg-[#0B111A] border-t border-white/5 shrink-0 z-10">
            <a
              href={selectedEvent.regLink || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`block w-full text-center py-4 font-black font-mono uppercase tracking-[0.2em] transition-all text-xs ${
                selectedEvent.regLink ? 'bg-[#50fa7b] hover:bg-white text-black shadow-[0_0_30px_rgba(80,250,123,0.3)]' : 'bg-white/5 text-gray-500 cursor-not-allowed'
              }`}
            >
              {selectedEvent.regLink ? "INITIALIZE_REGISTRATION ↗" : "REGISTRATION_CLOSED"}
            </a>
          </div>
        </div>
      </div>

      {/* OS Footer */}
      <div className="bg-[#0f172a] px-5 py-2 flex justify-between items-center border-t border-[#2a2e3f] shrink-0 z-20">
        <div className="text-[#50fa7b] text-[9px] tracking-widest uppercase font-bold animate-pulse">[ SECURE_CONNECTION_STABLE ]</div>
        <div className="text-gray-500 text-[9px] uppercase font-bold tracking-widest">PORT: 8080</div>
      </div>
    </div>
  </div>
)}
    </section>
  );
}