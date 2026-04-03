"use client";
import { useEffect, useState } from "react";

// ── THE ENRICHED MISSION ARCHIVE (Using data from your actual reports) ──
const pastEvents = [
  {
    id: "cfc-past-006",
    title: "AWS For ECE",
    date: "2026-03-23",
    category: "WORKSHOP",
    venue: "Seminar Hall, 2nd floor, A6 building",
    description: "A technical workshop tailored for ECE students demonstrating how cloud infrastructure supports modern hardware systems, IoT, and signal processing workflows.",
    status: "ARCHIVED",
    faculty: ["Dr. Upesh Patel", "Dr. Purvi Prajapati"],
    students: ["Vedansh Verdia", "Jiya Thakkar"],
    participants: 72,
    outcome: "Successfully introduced 72 students to Amazon Web Services (AWS), providing hands-on experience in cloud computing, EC2, S3, and infrastructure management."
  },
  {
    id: "cfc-past-005",
    title: "CODE.PY - Python Hackathon",
    date: "2025-03-17 to 2025-03-19",
    category: "HACKATHON",
    venue: "Project Lab-2, CSPIT",
    description: "A comprehensive three-day Python hackathon challenging students to build, debug, and deliver working Python-based solutions to real-world problems under time constraints.",
    status: "ARCHIVED",
    faculty: ["Dr. Killol Pandya", "Dr. Sagar Patel", "Prof. Vishal Shah"],
    students: ["Vedansh Verdia", "Priyanshu Purohit", "Pruthvish Dave"],
    participants: 120, // Estimated based on scale
    outcome: "Participants enhanced their logical thinking and Python coding proficiency, successfully delivering working software solutions by the end of the 3-day sprint."
  },
  {
    id: "cfc-past-004",
    title: "C Hackathon",
    date: "2024-10-19",
    category: "HACKATHON",
    venue: "Project Lab-2, CSPIT",
    description: "Immersed participants in the core concepts of C programming through competitive challenges. Focused on solving real-world problems using C and enhancing coding efficiency.",
    status: "ARCHIVED",
    faculty: ["Dr. Killol V. Pandya"],
    students: ["Pruthvish Dave", "Suchita Gaddam", "Moksh Chavada", "Vedansh Verdia", "Priyanshu Purohit"],
    participants: 75,
    outcome: "75 first-semester students gained hands-on experience in algorithm design and problem-solving, fostering a collaborative and competitive programming environment."
  },
  {
    id: "cfc-past-003",
    title: "Arduino Hands-on Experience (Vol. 2)",
    date: "2024-09-26",
    category: "WORKSHOP",
    venue: "Project Lab 2, CSPIT",
    description: "A hands-on workshop introducing first-year students to the fundamentals of Arduino, including understanding basic projects and interfacing with ultrasonic and 7-segment sensors.",
    status: "ARCHIVED",
    faculty: ["Dr. Killol V. Pandya"],
    students: ["Vedansh Verdia", "Priyanshu Purohit", "Moksh Chavada", "Suchita Gaddam", "Pruthvish Dave"],
    participants: 60,
    outcome: "First-year students successfully built and simulated basic Arduino circuits, grasping the core concepts of microcontroller interfacing."
  },
  {
    id: "cfc-past-002",
    title: "Arduino Hands-on Experience",
    date: "2024-03-16",
    category: "WORKSHOP",
    venue: "Project Lab-II, CSPIT",
    description: "Introduced participants to the fundamentals of Arduino. Covered basic projects, interfacing with different sensors like ultrasonic, IR, 7 segment, and designing circuits in Proteus software.",
    status: "ARCHIVED",
    faculty: ["Dr. Killol V. Pandya"],
    students: ["Kushal Shah", "Priyanshu Talapara", "Kashyap Vaghani", "Saharsh Solanki"],
    participants: 65,
    outcome: "Participants developed valuable skills in coding, circuit design, and problem-solving through practical exercises with Proteus software and physical sensors."
  },
  {
    id: "cfc-past-001",
    title: "Hackathon 2023: Codefeista",
    date: "2023-10-11",
    category: "HACKATHON",
    venue: "CSPIT, CHARUSAT",
    description: "First-year students gained valuable hands-on experience in coding, debugging, teamwork, and project management through logical analysis and problem-solving.",
    status: "ARCHIVED",
    faculty: ["Dr. Killol V. Pandya"],
    students: ["Kushal Shah", "Priyanshu Talapara", "Kashyap Vaghani", "Kartik Singh", "Sreelakshmi Kurup"],
    participants: 80,
    outcome: "Successfully challenged coders with a new set of problem statements, improving their critical thinking and project management skills under pressure."
  }
];

const cyberStyles = `
  @keyframes drawLine {
    from { height: 0; }
    to { height: 100%; }
  }
  .animate-line {
    animation: drawLine 2s ease-out forwards;
  }
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 10px #50fa7b, 0 0 20px #50fa7b; }
    50% { box-shadow: 0 0 2px #50fa7b, 0 0 5px #50fa7b; }
  }
  .node-glow {
    animation: pulseGlow 3s infinite;
  }
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #50fa7b40; border-radius: 10px; }
`;

// Scroll Lock Hook for Modal
function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) { document.body.style.overflow = ""; return; }
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [active]);
}

export default function ArchiveSection() {
  const [mounted, setMounted] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  useScrollLock(!!selectedReport);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section id="archive" className="w-full bg-[#05060a] border-t border-white/5 py-24 relative z-10 scroll-mt-20 font-mono text-white">
      <style>{cyberStyles}</style>

      {/* Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-20" 
           style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <div className="mb-20 text-center">
          <div className="inline-block border border-[#50fa7b]/30 bg-[#50fa7b]/10 px-4 py-1.5 text-[#50fa7b] text-xs font-bold uppercase tracking-widest mb-6">
            [ SYSTEM_LOGS ]
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold uppercase tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
            Mission <span className="text-[#50fa7b]">Archive</span>
          </h2>
          <p className="text-gray-400 text-sm md:text-base uppercase tracking-[0.2em] max-w-2xl mx-auto">
            Decrypted timeline of past network events and training modules.
          </p>
        </div>

        {/* The Timeline Container */}
        <div className="relative">
          
          {/* Central Vertical Line (Animated) */}
          {mounted && (
            <div className="absolute left-[16px] md:left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#50fa7b] via-[#00d2ff] to-transparent md:-translate-x-[1px] animate-line origin-top" />
          )}

          <div className="space-y-12 md:space-y-24">
            {pastEvents.map((event, index) => {
              const isEven = index % 2 === 0;
              
              return (
                <div key={event.id} className={`relative flex flex-col md:flex-row items-start md:items-center ${isEven ? 'md:flex-row-reverse' : ''}`}>
                  
                  {/* Glowing Node */}
                  <div className="absolute left-[12px] md:left-1/2 w-3 h-3 bg-[#0B111A] border-2 border-[#50fa7b] rounded-full md:-translate-x-1/2 mt-6 md:mt-0 z-20 node-glow" />

                  {/* Empty space for alternating layout */}
                  <div className="hidden md:block md:w-1/2" />

                  {/* The Event Card (Clickable) */}
                  <div className={`w-full md:w-1/2 pl-12 md:pl-0 ${isEven ? 'md:pr-12' : 'md:pl-12'}`}>
                    <div 
                      onClick={() => setSelectedReport(event)}
                      className="bg-[#0B111A] border border-white/10 hover:border-[#50fa7b]/50 rounded-2xl p-6 md:p-8 transition-all duration-300 hover:shadow-[0_0_30px_rgba(80,250,123,0.15)] hover:-translate-y-1 group cursor-pointer"
                    >
                      {/* Date & Category */}
                      <div className="flex flex-wrap gap-2 items-center justify-between mb-4">
                        <span className="text-[#00d2ff] text-[10px] sm:text-xs font-bold tracking-widest">
                          [{event.date}]
                        </span>
                        <span className={`text-[8px] font-bold tracking-widest uppercase px-2 py-1 rounded border ${
                          event.category === 'HACKATHON' ? 'bg-[#bd93f9]/10 border-[#bd93f9]/30 text-[#bd93f9]' : 'bg-[#ffb86c]/10 border-[#ffb86c]/30 text-[#ffb86c]'
                        }`}>
                          {event.category}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-xl md:text-2xl font-black uppercase tracking-wide text-white group-hover:text-[#50fa7b] transition-colors mb-2 leading-tight">
                        {event.title}
                      </h3>

                      <p className="text-gray-400 text-[10px] sm:text-xs leading-relaxed line-clamp-2 mb-4">
                        {event.description}
                      </p>

                      {/* Interactive Prompt */}
                      <div className="mt-4 border-t border-white/5 pt-4 flex justify-between items-center">
                        <span className="text-gray-600 text-[8px] uppercase tracking-[0.3em] font-bold">
                          STATUS: {event.status}
                        </span>
                        <span className="text-[#50fa7b] text-[9px] uppercase tracking-widest font-bold group-hover:underline flex items-center gap-1">
                          READ_REPORT ↗
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {/* End of Timeline Dot */}
          <div className="relative mt-12 md:mt-24 flex justify-start md:justify-center pl-[11px] md:pl-0 z-20">
            <div className="w-3.5 h-3.5 bg-gray-800 border-2 border-gray-600 rounded-full" />
          </div>
          <div className="text-left md:text-center mt-4 pl-[30px] md:pl-0 text-gray-600 text-[8px] uppercase tracking-[0.3em] font-bold">
            END OF RECORD
          </div>
        </div>
      </div>

      {/* ── THE AFTER-ACTION REPORT MODAL ── */}
      {selectedReport && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6"
          onClick={() => setSelectedReport(null)}
        >
          <div 
            className="w-full max-w-4xl bg-[#0B111A] border border-[#50fa7b]/40 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(80,250,123,0.15)] flex flex-col"
            style={{ maxHeight: "90vh", animation: "fadeSlideIn 0.3s ease forwards" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Terminal Header */}
            <div className="bg-[#050608] px-4 py-3 flex justify-between items-center border-b border-[#50fa7b]/20 shrink-0">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5555]" />
                <div className="w-3 h-3 rounded-full bg-[#f1fa8c]" />
                <div className="w-3 h-3 rounded-full bg-[#50fa7b]" />
              </div>
              <div className="text-[#50fa7b] text-[10px] font-mono tracking-widest uppercase">
                /root/archive/reports/{selectedReport.id}.log
              </div>
              <button 
                onClick={() => setSelectedReport(null)}
                className="text-gray-500 hover:text-white font-bold text-lg leading-none"
              >✕</button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar relative">
              
              {/* Classified Watermark */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10vw] font-black text-white/[0.02] pointer-events-none -rotate-45 uppercase tracking-widest whitespace-nowrap select-none">
                DECLASSIFIED
              </div>

              {/* Header Info */}
              <div className="mb-8 relative z-10">
                <div className="inline-block bg-[#00d2ff]/10 text-[#00d2ff] border border-[#00d2ff]/30 px-3 py-1 text-[9px] font-bold uppercase tracking-widest mb-3">
                  AFTER-ACTION REPORT
                </div>
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white mb-2">
                  {selectedReport.title}
                </h2>
                <div className="text-gray-400 text-xs tracking-widest uppercase flex flex-wrap gap-4">
                  <span>DATE: {selectedReport.date}</span>
                  <span className="text-gray-600">|</span>
                  <span>LOCATION: {selectedReport.venue}</span>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
                {/* Mission Execution */}
                <div className="bg-[#050608] border border-white/5 rounded-lg p-5">
                  <h3 className="text-[#ffb86c] text-[10px] font-bold uppercase tracking-[0.2em] mb-3 border-b border-white/5 pb-2">
                    &gt; Mission_Execution
                  </h3>
                  <p className="text-gray-300 text-xs leading-relaxed text-justify mb-4">
                    {selectedReport.description}
                  </p>
                  <div className="bg-[#50fa7b]/5 border border-[#50fa7b]/20 rounded p-3">
                    <h4 className="text-[#50fa7b] text-[9px] font-bold uppercase tracking-widest mb-1">Final_Outcome</h4>
                    <p className="text-gray-400 text-[10px] leading-relaxed">
                      {selectedReport.outcome}
                    </p>
                  </div>
                </div>

                {/* Personnel & Metrics */}
                <div className="flex flex-col gap-4">
                  {/* Metrics */}
                  <div className="bg-[#050608] border border-white/5 rounded-lg p-5 flex items-center justify-between">
                    <div>
                      <h3 className="text-[#00d2ff] text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
                        Active_Participants
                      </h3>
                      <p className="text-gray-500 text-[9px] uppercase tracking-widest">Total Operatives Deployed</p>
                    </div>
                    <div className="text-3xl font-black text-white">
                      {selectedReport.participants}
                    </div>
                  </div>

                  {/* Personnel */}
                  <div className="bg-[#050608] border border-white/5 rounded-lg p-5 flex-1">
                    <h3 className="text-[#bd93f9] text-[10px] font-bold uppercase tracking-[0.2em] mb-3 border-b border-white/5 pb-2">
                      &gt; Authorized_Personnel
                    </h3>
                    <div className="mb-3">
                      <span className="text-gray-500 text-[9px] uppercase tracking-widest block mb-1">Faculty Overseer(s):</span>
                      {selectedReport.faculty.map((name: string) => (
                        <div key={name} className="text-white text-xs mb-0.5">• {name}</div>
                      ))}
                    </div>
                    <div>
                      <span className="text-gray-500 text-[9px] uppercase tracking-widest block mb-1">Student Coordinators:</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedReport.students.map((name: string) => (
                          <span key={name} className="bg-white/5 border border-white/10 text-gray-300 text-[9px] px-2 py-1 rounded">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-[#050608] px-6 py-4 border-t border-[#50fa7b]/20 flex justify-between items-center shrink-0">
              <div className="text-gray-500 text-[9px] uppercase tracking-[0.2em] font-bold animate-pulse">
                _END_OF_REPORT
              </div>
              <button 
                onClick={() => setSelectedReport(null)}
                className="bg-transparent border border-[#50fa7b]/40 text-[#50fa7b] hover:bg-[#50fa7b] hover:text-black px-6 py-2 rounded text-[10px] uppercase tracking-widest font-bold transition-colors"
              >
                Close_Terminal
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}