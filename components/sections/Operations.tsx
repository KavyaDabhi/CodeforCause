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
      
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 mb-10 md:mb-12 text-center md:text-left">
       <h1 className="text-xl sm:text-2xl md:text-5xl font-black tracking-[0.15em] sm:tracking-widest mb-4 uppercase text-[#00d2ff] drop-shadow-[0_0_15px_rgba(0,210,255,0.3)] leading-tight">
  [ CFC_OPERATIONS_REGISTRY ]
</h1>
        <p className="text-gray-400 text-sm">
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
          <div className="w-full mt-8 md:mt-32 flex justify-center px-4">
            <div className="w-full max-w-6xl min-h-[80px] md:h-32 bg-[#05080c] border-y border-[#00d2ff]/10 flex flex-col md:flex-row items-start md:items-center justify-between px-5 md:px-12 py-4 md:py-0 transition-all shadow-[0_0_50px_rgba(0,210,255,0.02)] relative overflow-hidden gap-4 md:gap-0">
              
              {/* Left: Title & Timer */}
              <div className="flex flex-col justify-center gap-1">
                <HomeTimer target={latestEvent.countdownTarget} />
                <span className="text-[#00d2ff]/40 text-[9px] font-mono tracking-[0.3em] uppercase">
                  ACTIVE_NODE: {latestEvent.title}
                </span>
              </div>
 
              {/* Right: Registration Button */}
              {latestEvent.regLink && (
                <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto">
                  <div className="hidden md:block h-12 w-[1px] bg-[#00d2ff]/10" />
                  <Link 
                    href={latestEvent.regLink} 
                    target="_blank" 
                    className="w-full md:w-auto text-center px-5 md:px-6 py-3 border border-[#00d2ff]/30 text-[#00d2ff] hover:bg-[#00d2ff] hover:text-black text-[10px] md:text-xs font-black transition-all duration-300 font-mono uppercase tracking-[0.2em] hover:shadow-[0_0_20px_rgba(0,210,255,0.4)]"
                  >
                    // JOIN_OPERATION _
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 animate-fadeUp">
            {filteredEvents.map((event) => (
              <div 
                key={event.id} 
                onClick={() => setSelectedEvent(event)}
                className="w-full h-[480px] sm:h-[540px] md:h-[580px] bg-[#0a0c10] border-2 border-[#00d2ff]/30 rounded-none overflow-hidden flex flex-col group grayscale hover:grayscale-0 transition-all duration-300 hover:shadow-[0_0_60px_rgba(0,210,255,0.2)] cursor-pointer relative"
              >
                <div className="bg-[#0f172a] px-3 py-2.5 flex justify-between items-center border-b border-[#00d2ff]/30 shrink-0">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5555]" />
                    <div className="w-3 h-3 rounded-full bg-[#f1fa8c]" />
                    <div className="w-3 h-3 rounded-full bg-[#50fa7b]" />
                  </div>
                  <div className="text-gray-400 text-[10px] font-mono tracking-widest uppercase truncate max-w-[120px] md:max-w-none">
                    {event.title.toLowerCase().replace(/\s+/g, '_')}.exe
                  </div>
                  <div className="text-gray-500 font-bold text-sm">✕</div>
                </div>
 
                <div className="w-full relative bg-[#050A14] flex-grow overflow-hidden">
                  {event.posterUrl ? (
                    <img src={event.posterUrl} className="absolute inset-0 w-full h-full object-fill opacity-80 group-hover:opacity-100 transition-opacity" alt={event.title} />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[#00d2ff]/30 text-xs font-mono">[ NO_VISUAL ]</div>
                  )}
                  
                  <div className="absolute bottom-0 left-0 w-full p-5 bg-gradient-to-t from-[#0a0c10] via-[#0a0c10]/80 to-transparent pt-20">
                    <div className="relative h-14 w-full flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center justify-center transition-all duration-500 group-hover:opacity-0 group-hover:scale-95 group-hover:-translate-y-4">
                        <div className="px-4 md:px-6 py-3 border border-[#00d2ff]/40 bg-[#00d2ff]/5 text-[#00d2ff] font-mono font-bold text-xs uppercase tracking-[0.2em]">
                          [ {event.category.toUpperCase()} ]
                        </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-105 translate-y-4 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 transition-all duration-500">
                        <button className="w-full py-4 bg-[#00d2ff] text-black font-black text-sm uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(0,210,255,0.6)]">
                          EXECUTE DETAILS _
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
 
                <div className="bg-[#0f172a] px-4 py-2.5 flex justify-between items-center border-t border-[#00d2ff]/30 shrink-0">
                  <div className="text-[#50fa7b] text-[10px] font-mono tracking-widest uppercase font-bold">[ LISTENING ]</div>
                  <div className="text-gray-500 text-[10px] font-mono uppercase font-bold">PORT: 8080</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
 
      {/* DETAIL MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-2 md:p-8" onClick={() => setSelectedEvent(null)}>
          <div className="w-full max-w-[1100px] h-[95vh] md:h-[90vh] bg-[#0B111A] border border-[#2a2e3f] rounded-none overflow-hidden flex flex-col relative" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="bg-[#0f172a] px-4 py-3 flex justify-between items-center border-b border-[#2a2e3f] shrink-0 font-mono">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5555]" />
                <div className="w-3 h-3 rounded-full bg-[#f1fa8c]" />
                <div className="w-3 h-3 rounded-full bg-[#50fa7b]" />
              </div>
              <div className="text-gray-400 text-[10px] md:text-[11px] font-mono tracking-widest uppercase truncate max-w-[150px] md:max-w-none">
                {selectedEvent.title.toLowerCase().replace(/\s+/g, '_')}_node.bin
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-white font-bold text-xl leading-none w-6 h-6 flex items-center justify-center hover:bg-white/10">✕</button>
            </div>
 
            <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden">
              {/* Poster */}
              <div className="lg:w-[45%] bg-black flex items-center justify-center border-b lg:border-b-0 lg:border-r border-[#2a2e3f] shrink-0 max-h-[40vh] lg:max-h-none">
                {selectedEvent.posterUrl ? (
                  <img src={selectedEvent.posterUrl} alt={selectedEvent.title} className="w-full h-full object-contain" />
                ) : (
                  <div className="text-gray-600 font-mono tracking-widest py-12">[ NO_VISUAL_FEED ]</div>
                )}
              </div>
 
              {/* Details */}
              <div className="lg:w-[55%] bg-[#0B111A] p-5 md:p-10 flex flex-col lg:overflow-y-auto">
                <div className="bg-white/5 text-[#00d2ff] text-[10px] md:text-xs font-bold px-4 py-1.5 rounded-none uppercase tracking-[0.2em] w-fit mb-4 md:mb-6 border border-[#00d2ff]/30 font-mono">
                  [ {selectedEvent.category.toUpperCase()} ]
                </div>
                <h2 className="text-white text-2xl md:text-4xl lg:text-5xl font-extrabold mb-3 md:mb-4 leading-tight tracking-tight uppercase">
                  {selectedEvent.title}
                </h2>
                <p className="text-[#4ade80] text-sm md:text-base font-semibold mb-6 md:mb-8 font-mono tracking-wider">&gt; CHARUSAT_NODE_ACTIVE</p>
 
                <div className="grid grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4 shrink-0">
                  <div className="bg-[#121824] p-4 md:p-5 border border-white/5 flex gap-3 md:gap-4">
                    <div>
                      <div className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1">DATE</div>
                      <div className="text-white text-xs md:text-sm font-bold font-mono">{selectedEvent.date}</div>
                    </div>
                  </div>
                  <div className="bg-[#121824] p-4 md:p-5 border border-white/5 flex gap-3 md:gap-4">
                    <div>
                      <div className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1">TIME</div>
                      <div className="text-white text-xs md:text-sm font-bold font-mono">{selectedEvent.startTime || "TBA"}</div>
                    </div>
                  </div>
                </div>
 
                <div className="bg-[#121824] p-4 md:p-5 border border-white/5 flex gap-4 mb-6 md:mb-8 shrink-0">
                  <div>
                    <div className="text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-1">LOCATION</div>
                    <div className="text-white text-xs md:text-sm font-bold leading-relaxed font-mono">{selectedEvent.venue || "ENCRYPTED_NODE"}</div>
                  </div>
                </div>
 
                <div className="mb-8 md:mb-10">
                  <h3 className="text-[#4ade80] text-sm font-bold uppercase tracking-widest mb-3 md:mb-4 font-mono">$&gt; MISSION_DESCRIPTION</h3>
                  <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-mono">{selectedEvent.description}</div>
                </div>
 
                <div className="mt-auto pt-6 md:pt-8 shrink-0">
                  <a
                    href={selectedEvent.regLink || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block w-full text-center py-4 font-bold font-mono uppercase tracking-[0.2em] transition-colors text-sm md:text-base ${
                      selectedEvent.regLink ? 'bg-[#16a34a] hover:bg-[#15803d] text-white' : 'bg-white/5 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {selectedEvent.regLink ? "INITIALIZE_REGISTRATION ↗" : "REGISTRATION_CLOSED"}
                  </a>
                </div>
              </div>
            </div>
 
            <div className="bg-[#0f172a] px-5 py-2.5 flex justify-between items-center border-t border-[#2a2e3f] shrink-0 font-mono">
              <div className="text-[#50fa7b] text-[10px] tracking-widest uppercase font-bold animate-pulse">[ SECURE_CONNECTION_STABLE ]</div>
              <div className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">PORT: 8080</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}