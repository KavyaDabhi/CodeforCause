"use client";
import { useState, useEffect } from "react";
import Link from 'next/link';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
 
const advisoryBoard = [
  {
    id: "SYS_01",
    name: "Dr. Trushit Upadhyaya",
    role: "Principal, CSPIT",
    image: "/Trushit.jpg", 
    linkedin: "https://www.linkedin.com/in/tkupadhyaya",
    badgeColor: "bg-[#00d2ff]",
    borderColor: "border-[#00d2ff]",
    icon: <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
  },
  {
    id: "SYS_02",
    name: "Dr. Upesh Patel",
    role: "HOD, EC-CSPIT",
    image: "/upesh.jpg", 
    linkedin: "https://www.linkedin.com/in/dr-upesh-patel-875878138",
    badgeColor: "bg-[#00d2ff]", 
    borderColor: "border-[#00d2ff]",
    icon: <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
  }
];
 
const facultyTeam = [
  {
    id: "ROOT_01",
    name: "Dr. Killol V. Pandya",
    role: "Faculty Coordinator",
    image: "/killol.jpg", 
    linkedin: "https://www.linkedin.com/in/dr-killol-pandya-275443252",
    badgeColor: "bg-[#1a73e8]",
    borderColor: "border-[#1a73e8]",
    icon: <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  }
];
 
const defaultStudentCoordinators = [
  {
    id: "NODE_01",
    name: "Vedansh Verdia",
    role: "Student Coordinator",
    image: "/vedansh.jpg",
    linkedin: "https://www.linkedin.com/in/vedanshverdia",
    badgeColor: "bg-[#00d2ff]",
    borderColor: "border-[#00d2ff]",
    icon: <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
  },
  {
    id: "NODE_02",
    name: "Kavya Dabhi",
    role: "Student Coordinator",
    image: "/kavya.jpg",
    linkedin: "https://www.linkedin.com/in/kavya-dabhi-69632a265",
    badgeColor: "bg-[#00d2ff]", 
    borderColor: "border-[#00d2ff]",
    icon: <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  },
  {
    id: "NODE_03",
    name: "Moksh Chavada",
    role: "Student Coordinator",
    image: "/moksh.jpg",
    linkedin: "https://www.linkedin.com/in/moksh-chavada-352431283",
    badgeColor: "bg-[#00d2ff]",
    borderColor: "border-[#00d2ff]",
    icon: <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
  }
];
 
export default function TeamPage() {
  const [dynamicOperatives, setDynamicOperatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    const q = query(collection(db, "team"), orderBy("hierarchy", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setDynamicOperatives(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);
 
  const allCoreOperatives = [...defaultStudentCoordinators, ...dynamicOperatives];
 
  return (
    <section id="team" className="flex min-h-screen flex-col items-center justify-start relative overflow-x-hidden bg-[#05060a] pt-20 md:pt-32 pb-24 px-4 md:px-6">
      
      {/* KALI CYBER GRID BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none opacity-10 z-0 fixed"
           style={{ 
             backgroundImage: `linear-gradient(rgba(0, 210, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 210, 255, 0.2) 1px, transparent 1px)`,
             backgroundSize: '40px 40px',
             maskImage: 'radial-gradient(ellipse at top, black, transparent 80%)'
           }} 
      />
 
      {/* Cyber Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] md:w-[800px] h-[300px] md:h-[500px] bg-[#1a73e8]/10 blur-[150px] rounded-full pointer-events-none -z-10" />
 
      {/* HEADER */}
      <div className="max-w-4xl w-full text-center mb-12 md:mb-20 z-10 animate-fadeUp px-2">
        <span className="text-[#00d2ff] font-mono text-xs md:text-sm tracking-[0.3em] md:tracking-[0.4em] uppercase mb-4 block opacity-90">
          Directory / Authorized_Nodes
        </span>
        <h1 className="text-4xl md:text-7xl font-extrabold text-white uppercase tracking-widest font-mono mb-6 drop-shadow-[0_0_15px_rgba(0,210,255,0.3)]">
          The <span className="text-[#00d2ff]">Network</span>
        </h1>
        <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto font-mono leading-relaxed">
          <span className="text-[#00d2ff] animate-pulse mr-2 font-bold">&gt;</span> 
          Meet the system administrators and core operators managing the Code for Cause infrastructure.
        </p>
        <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-[#00d2ff]/40 to-transparent mx-auto mt-8" />
      </div>
 
      {/* LEADERSHIP SECTION */}
      <div className="w-full max-w-6xl z-10 mb-14 md:mb-20 flex flex-col items-center animate-fadeUp">
        <h2 className="text-[#00d2ff] font-mono text-xs md:text-sm tracking-[0.3em] uppercase mb-6 md:mb-8 font-bold">
          EXECUTIVE_LEADERSHIP
        </h2>
        {/* Stack on mobile, row on sm+ */}
        <div className="flex flex-col sm:flex-row justify-center gap-5 md:gap-8 w-full">
          {advisoryBoard.map((member) => (
            <a
              key={member.id}
              href={member.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-row sm:flex-col items-center gap-5 sm:gap-0 bg-[#0a0c10] border border-white/5 rounded-2xl md:rounded-3xl p-5 md:p-8 transition-all duration-300 hover:border-[#00d2ff] hover:shadow-[0_0_30px_rgba(0,210,255,0.15)] hover:-translate-y-1 w-full sm:max-w-sm cursor-pointer group"
            >
              <div className="relative shrink-0 sm:mb-6">
                <div className={`w-20 h-20 md:w-32 md:h-32 rounded-full border-4 ${member.borderColor} overflow-hidden bg-black p-1 transition-transform duration-300 group-hover:scale-105`}>
                  <img src={member.image} alt={member.name} className="w-full h-full object-cover rounded-full transition-all duration-700 scale-105 group-hover:scale-100" />
                </div>
                <div className={`absolute bottom-0 right-0 sm:bottom-1 sm:right-1 w-7 h-7 md:w-8 md:h-8 ${member.badgeColor} rounded-full border-4 border-[#0a0c10] flex items-center justify-center text-black transition-transform duration-300 group-hover:scale-110 shadow-[0_0_10px_rgba(0,210,255,0.5)]`}>
                  {member.icon}
                </div>
              </div>
              <div className="flex flex-col sm:items-center">
                <h3 className="text-base md:text-xl font-bold text-white uppercase tracking-wide mb-2 sm:text-center group-hover:text-[#00d2ff] transition-colors">{member.name}</h3>
                <span className="text-[#00d2ff] font-mono text-[10px] tracking-widest uppercase bg-[#00d2ff]/10 px-3 md:px-4 py-1 md:py-1.5 rounded-full border border-[#00d2ff]/20">{member.role}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
 
      {/* FACULTY COORDINATOR */}
      <div className="w-full max-w-6xl z-10 mb-14 md:mb-20 flex flex-col items-center animate-fadeUp">
        <h2 className="text-[#1a73e8] font-mono text-xs md:text-sm tracking-[0.3em] uppercase mb-6 md:mb-8 font-bold">
          Faculty Coordinator
        </h2>
        <div className="flex justify-center w-full">
          {facultyTeam.map((member) => (
            <a
              key={member.id}
              href={member.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-row sm:flex-col items-center gap-5 sm:gap-0 bg-[#0a0c10] border border-white/5 rounded-2xl md:rounded-3xl p-5 md:p-8 transition-all duration-300 hover:border-[#1a73e8] hover:shadow-[0_0_30px_rgba(26,115,232,0.15)] hover:-translate-y-1 w-full sm:max-w-sm cursor-pointer group"
            >
              <div className="relative shrink-0 sm:mb-6">
                <div className={`w-20 h-20 md:w-32 md:h-32 rounded-full border-4 ${member.borderColor} overflow-hidden bg-black p-1 transition-transform duration-300 group-hover:scale-105`}>
                  <img src={member.image} alt={member.name} className="w-full h-full object-cover rounded-full" />
                </div>
                <div className={`absolute bottom-0 right-0 sm:bottom-1 sm:right-1 w-7 h-7 md:w-8 md:h-8 ${member.badgeColor} rounded-full border-4 border-[#0a0c10] flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                  {member.icon}
                </div>
              </div>
              <div className="flex flex-col sm:items-center">
                <h3 className="text-base md:text-xl font-bold text-white uppercase tracking-wide mb-2 sm:text-center group-hover:text-[#1a73e8] transition-colors">{member.name}</h3>
                <span className="text-[#1a73e8] font-mono text-xs uppercase bg-[#1a73e8]/10 px-3 py-1 rounded-full border border-[#1a73e8]/20">{member.role}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
 
      {/* CORE OPERATIVES */}
      <div className="w-full max-w-6xl z-10 mb-14 md:mb-20 flex flex-col items-center animate-fadeUp">
        <h2 className="text-[#00d2ff] font-mono text-xs md:text-sm tracking-[0.3em] uppercase mb-6 md:mb-8 font-bold">
          Core Operators
        </h2>
 
        {loading ? (
          <div className="text-[#00d2ff] font-mono animate-pulse tracking-widest">[ Fetching_Network... ]</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8 w-full justify-items-center">
            {allCoreOperatives.map((student) => (
              <a
                key={student.id}
                href={student.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-row sm:flex-col items-center gap-5 sm:gap-0 bg-[#0a0c10] border border-white/5 rounded-2xl md:rounded-3xl p-5 md:p-8 transition-all duration-300 hover:border-[#00d2ff] hover:shadow-[0_0_30px_rgba(0,210,255,0.1)] hover:-translate-y-1 w-full sm:max-w-sm cursor-pointer group"
              >
                <div className="relative shrink-0 sm:mb-6">
                  <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full border-4 ${student.borderColor || 'border-[#00d2ff]'} overflow-hidden bg-black p-1 transition-transform duration-300 group-hover:scale-105`}>
                    <img src={student.image} alt={student.name} className="w-full h-full object-cover rounded-full" />
                  </div>
                  <div className={`absolute bottom-0 right-0 w-7 h-7 md:w-8 md:h-8 ${student.badgeColor || 'bg-[#00d2ff]'} rounded-full border-4 border-[#0a0c10] flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                    {student.icon || <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                  </div>
                </div>
                <div className="flex flex-col sm:items-center">
                  <h3 className="text-base md:text-xl font-bold text-white uppercase tracking-wide mb-2 sm:text-center group-hover:text-[#00d2ff] transition-colors">{student.name}</h3>
                  <span className="text-[#00d2ff] font-mono text-xs uppercase bg-[#00d2ff]/10 px-3 py-1 rounded-full border border-[#00d2ff]/20 sm:text-center line-clamp-1">{student.role}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
 
      {/* Back Button */}
      <div className="z-10 mt-8 md:mt-12">
        <Link href="/#Home" className="group flex items-center justify-center gap-2 px-6 py-3 bg-transparent text-gray-400 border border-gray-800 hover:border-white hover:text-white rounded-xl font-mono text-sm transition-all duration-300">
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          RETURN_TO_ROOT
        </Link>
      </div>
      
    </section>
  );
}