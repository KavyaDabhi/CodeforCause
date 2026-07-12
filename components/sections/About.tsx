import Link from 'next/link';
 import { useGotham } from '@/app/context/GothamContext';
export default function AboutSection() {
  const { isGothamMode } = useGotham();
  return (
    <section 
      id="about" 
      className="w-full flex flex-col items-center justify-start relative z-10 bg-[#05060a] pt-20 md:pt-32 pb-20 px-4 md:px-6 scroll-mt-20 min-h-screen"
    >
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
 
      {/* TOP LOGO */}
      <div className="flex justify-center mb-6 mt-4 relative z-50 animate-fadeUp">
        <a 
          href="https://www.charusat.ac.in/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block"
        >
          <img
            src="/FINAL.png"
            alt="Institution Logos"
            className="h-14 md:h-20 w-auto object-contain cursor-pointer transition-transform duration-300 ease-in-out hover:scale-105 hover:brightness-110"
          />
        </a>
      </div>
 
      {/* HEADER */}
      <div className="max-w-4xl w-full text-center mb-10 md:mb-16 z-10 px-2">
        <span className="text-[#00d2ff] font-mono text-xs md:text-sm tracking-[0.3em] md:tracking-[0.4em] uppercase mb-4 block">
          Directory / WHO_ARE_WE?
        </span>
        <h1 className="text-4xl md:text-7xl font-extrabold text-white uppercase tracking-widest font-mono mb-6">
          System Overview
        </h1>
        <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto font-mono">
          <span className="text-[#50fa7b]">&gt;</span> Bridging the gap between theoretical knowledge and practical implementation at CHARUSAT.
        </p>
      </div>
 
      {/* MISSION TERMINAL */}
      <div className="w-full max-w-4xl z-10 mb-16 md:mb-20">
        <div className="bg-black/80 border border-white/10 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          
          {/* Terminal Header */}
          <div className="bg-white/5 border-b border-white/10 px-4 py-2 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-2 text-gray-500 font-mono text-xs">root@codeforcause:~</span>
          </div>
 
          {/* Terminal Content */}
          <div className="p-4 md:p-8 font-mono text-sm leading-relaxed text-gray-300">
            <p className="mb-4">
              <span className="text-[#50fa7b] font-bold">root@codeforcause:~$</span> cat mission_statement.txt
            </p>
            <p className="pl-3 md:pl-4 border-l-2 border-white/10 text-gray-400 mb-4">
              The mission of the Code for Cause Club is to provide a structured and progressive learning environment that strengthens programming fundamentals in C and C++ for first and second year students, while enabling senior students to advance their skills in Python and modern technologies.
            </p>
            <p className="pl-3 md:pl-4 border-l-2 border-white/10 text-gray-400 mb-4">
              The club emphasizes experiential learning through hands-on exposure to embedded systems and hardware platforms such as Arduino, ESP series, AVR, and ATmega microcontrollers, along with the development of IoT skills including sensor interfacing, device communication, and real-time data applications.
            </p>
            <p className="pl-3 md:pl-4 border-l-2 border-white/10 text-gray-400">
              Through workshops, coding sessions, laboratory practice, and project-based learning, the club bridges the gap between theoretical knowledge and practical implementation, preparing students for internships, industry requirements, higher studies, and innovative problem-solving.
            </p>
            <p className="mt-4 animate-pulse text-[#00d2ff]">_</p>
          </div>
        </div>
      </div>
 
      {/* VISION STATEMENT */}
      <div className="w-full max-w-6xl z-10 mb-16 md:mb-24 px-0 md:px-6">
        <div className="relative bg-gradient-to-r from-[#1a73e8]/20 to-[#00d2ff]/20 border border-[#00d2ff]/30 rounded-2xl md:rounded-3xl p-6 md:p-12 text-center overflow-hidden hover:border-[#00d2ff]/60 transition-colors duration-500">
          
          <svg className="absolute -right-10 -bottom-10 w-40 md:w-64 h-40 md:h-64 text-[#00d2ff] opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
 
          <h2 className="text-[#00d2ff] font-mono text-xs md:text-sm tracking-[0.3em] uppercase mb-4 font-bold">
            Our Vision
          </h2>
          <p className="text-lg md:text-3xl font-bold text-white leading-relaxed max-w-4xl mx-auto relative z-10">
            "To build a vibrant technical community that empowers students with strong programming, embedded systems, and IoT skills through logical thinking, hands-on learning, and continuous innovation, preparing them to develop practical solutions and succeed in academic and professional environments."
          </p>
        </div>
      </div>
 
      {/* CORE FOCUS AREAS */}
      <div className="w-full max-w-6xl z-10 mb-16 md:mb-24">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-[#50fa7b] font-mono text-xs md:text-sm tracking-[0.3em] uppercase mb-4 font-bold">
            Execution Parameters
          </h2>
          <h3 className="text-2xl md:text-5xl font-bold text-white tracking-wide">Technical Domains</h3>
        </div>
 
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          
          {/* Software */}
          <div className="bg-[#0a0c10] border border-white/5 rounded-2xl md:rounded-3xl p-6 md:p-8 hover:-translate-y-2 hover:border-[#1a73e8] hover:shadow-[0_0_30px_rgba(26,115,232,0.15)] transition-all duration-300">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-[#1a73e8]/20 rounded-xl flex items-center justify-center text-[#1a73e8] mb-5 md:mb-6 border border-[#1a73e8]/30">
              <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            </div>
            <h4 className="text-lg md:text-xl font-bold text-white mb-3">Software Architecture</h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              Strengthening programming fundamentals in C and C++ for underclassmen, while advancing senior skills in Python and modern frameworks.
            </p>
          </div>
 
          {/* Hardware */}
          <div className="bg-[#0a0c10] border border-white/5 rounded-2xl md:rounded-3xl p-6 md:p-8 hover:-translate-y-2 hover:border-yellow-400 hover:shadow-[0_0_30px_rgba(250,204,21,0.15)] transition-all duration-300">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-yellow-400/20 rounded-xl flex items-center justify-center text-yellow-400 mb-5 md:mb-6 border border-yellow-400/30">
              <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
            </div>
            <h4 className="text-lg md:text-xl font-bold text-white mb-3">Embedded Systems</h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              Experiential learning through hands-on exposure to hardware platforms such as Arduino, ESP series, AVR, and ATmega microcontrollers.
            </p>
          </div>
 
          {/* IoT */}
          <div className="bg-[#0a0c10] border border-white/5 rounded-2xl md:rounded-3xl p-6 md:p-8 hover:-translate-y-2 hover:border-[#50fa7b] hover:shadow-[0_0_30px_rgba(80,250,123,0.15)] transition-all duration-300">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-[#50fa7b]/20 rounded-xl flex items-center justify-center text-[#50fa7b] mb-5 md:mb-6 border border-[#50fa7b]/30">
              <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
            </div>
            <h4 className="text-lg md:text-xl font-bold text-white mb-3">Internet of Things (IoT)</h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              Development of IoT skills including advanced sensor interfacing, secure device communication, and real-time data application engineering.
            </p>
          </div>
 
        </div>
      </div>
 
      {/* ORIGIN BLOCK */}
      <div className="w-full max-w-4xl z-10 mb-20 text-center bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-6 md:p-10 backdrop-blur-md">
        <p className="text-gray-400 text-xs md:text-sm font-mono mb-4 md:mb-6 uppercase tracking-[0.2em]">Operating Out Of</p>
        <h3 className="text-xl md:text-4xl font-bold text-white mb-2">V. T. Patel Department of ECE</h3>
        <p className="text-base md:text-lg text-[#1a73e8] font-mono mb-6 md:mb-8">Chandubhai S. Patel Institute of Technology, CHARUSAT</p>
        
        <a 
          href="#team" 
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('team')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-[#1a73e8] text-white rounded-xl font-bold text-base md:text-lg hover:bg-white hover:text-[#05060a] shadow-[0_0_20px_rgba(26,115,232,0.4)] transition-all duration-300 cursor-none"
        >
          Meet the Authorized Nodes
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
        </a>
      </div>
 
    </section>
  );
}