"use client"; 
import { useEffect, useState } from 'react'; 
import Link from 'next/link';

// COMPONENT IMPORTS
import KaliBoot from '@/components/KaliBoot';
import BackgroundTraces from '@/components/BackgroundTraces';

// SECTION IMPORTS
import AboutSection from '@/components/sections/About';
import ArchiveSection from '@/components/sections/Archive'; // 🚀 Added Archive Section
import OperationsSection from '@/components/sections/Operations';
import TeamSection from '@/components/sections/Team';
import ContactSection from '@/components/sections/Contact';

let hasBooted = false;

export default function Home() {
  const [isBooting, setIsBooting] = useState(true);

  const handleBootComplete = () => {
    hasBooted = true;      
    setIsBooting(false);   
  };

  const activeNodesCount = "04"; 
  const totalParticipants = "256"; 
  const curatedEventsCount = "04"; 
  const hackathonsCount = "03"; 

  // ✅ Handles ?scrollTo= param (used by navbar + dashboard links)
  useEffect(() => {
    if (!isBooting) {
      const params = new URLSearchParams(window.location.search);
      const scrollTo = params.get('scrollTo');
      if (scrollTo) {
        setTimeout(() => {
          document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Clean the URL after scrolling so it doesn't persist on refresh
          window.history.replaceState({}, '', '/');
        }, 500);
      }
    }
  }, [isBooting]);

  const scrollToId = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <> 
      {isBooting && <KaliBoot onComplete={handleBootComplete} />}

      <main className={`flex min-h-screen flex-col items-center justify-start relative bg-[#05060a] transition-opacity duration-1000 ${isBooting ? 'opacity-0 h-screen overflow-hidden' : 'opacity-100 overflow-x-hidden'}`}>
      <BackgroundTraces />

      {/* 1. HERO SECTION */}
      <section id="home" className="relative w-full flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-8 text-center scroll-mt-20">
        <div className="absolute inset-0 pointer-events-none opacity-10 z-0"
             style={{ 
               backgroundImage: `linear-gradient(rgba(0, 210, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 210, 255, 0.2) 1px, transparent 1px)`,
               backgroundSize: '40px 40px',
               maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)'
             }} 
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-codeBlue/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>

        <div className="flex justify-center mb-6 mt-4 relative z-50 animate-fadeUp">
          <a href="https://www.charusat.ac.in/" target="_blank" rel="noopener noreferrer" className="block">
            <img src="/FINAL.png" alt="Institution Logos" className="h-20 w-auto object-contain cursor-pointer transition-transform duration-300 ease-in-out hover:scale-105 hover:brightness-110" />
          </a>
        </div>

        <div className="flex flex-col items-center justify-center mb-10 z-10">
          <span className="text-xl md:text-2xl tracking-tight mb-10 block font-bold text-codeBlue font-mono">root@cfc:~# ./initialize_system.sh</span>
          <div className="flex flex-row items-center justify-center gap-1 mb-10">
            <div className="bg-codeBlue w-16 h-16 md:w-24 md:h-24 rounded-xl flex items-center justify-center shadow-lg transform -skew-x-12 translate-y-3 md:translate-y-4 relative overflow-hidden">
              <span className="text-brandBase text-4xl md:text-6xl font-mono font-bold leading-none transform skew-x-12 pb-1 relative z-10">{"<"}</span>
              <div className="absolute inset-0 bg-white/10 [clip-path:polygon(0_0,100%_0,100%_20%,0_70%)]"></div>
            </div>
            <div className="bg-causeCyan w-16 h-16 md:w-24 md:h-24 rounded-xl flex items-center justify-center shadow-lg transform -skew-x-12 -translate-y-3 md:-translate-y-4 relative overflow-hidden">
              <span className="text-brandBase text-4xl md:text-6xl font-mono font-bold leading-none transform skew-x-12 pb-1 relative z-10">{">"}</span>
              <div className="absolute inset-0 bg-white/10 [clip-path:polygon(0_0,100%_0,100%_20%,0_70%)]"></div>
            </div>
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-widest text-brandText uppercase mb-4">Code for Cause</h1>
          <p className="text-sm md:text-base uppercase tracking-[0.4em] md:tracking-[0.6em] text-gray-400 font-mono">[ <span className="text-causeCyan">STATUS: ONLINE</span> ]</p>
        </div>

        <div className="max-w-2xl text-lg text-gray-400 mb-12 leading-relaxed px-4 font-mono text-left bg-brandCard/20 p-4 rounded-xl border border-white/5 z-10">
          <span className="text-[#50fa7b] font-bold">guest@kali:~$</span> cat mission_statement.txt <br/>
          <span className="text-gray-300 opacity-90 mt-2 block">{">"} Empowering students at CHARUSAT to build, develop, and excel in the world of code and hardware.</span>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 md:gap-6 z-10">
          <a href="#operations" onClick={(e) => scrollToId(e, 'operations')} className="group flex items-center justify-center gap-2 px-8 py-4 bg-causeCyan text-brandBase rounded-xl font-extrabold text-lg hover:bg-white shadow-[0_0_20px_rgba(0,210,255,0.4)] hover:-translate-y-0.5 transition-all duration-300">
            View Operations
          </a>
          <a href="#about" onClick={(e) => scrollToId(e, 'about')} className="group flex items-center justify-center gap-2 px-8 py-4 bg-transparent text-gray-300 border border-brandCard hover:border-codeBlue hover:text-codeBlue rounded-xl font-semibold text-lg transition-all duration-300 font-mono">
            WHO_ARE_WE?
          </a>
          <a href="#archive" onClick={(e) => scrollToId(e, 'archive')} className="group flex items-center justify-center gap-2 px-8 py-4 bg-transparent text-[#50fa7b] border border-[#50fa7b]/30 hover:border-[#50fa7b] hover:shadow-[0_0_15px_rgba(80,250,123,0.2)] rounded-xl font-semibold text-lg transition-all duration-300 font-mono">
            MISSION_ARCHIVE
          </a>
        </div>
      </section>

      {/* 2. DYNAMIC STATS STRIP */}
      <section className="w-full bg-brandCard/10 border-y border-white/5 py-12 relative z-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/5">
          <StatBox count={activeNodesCount} label="Active Nodes (Admins)" color="text-green-400" />
          <StatBox count={curatedEventsCount} label="Curated Events" color="text-codeBlue" />
          <StatBox count={totalParticipants + "+"} label="Total Participants" color="text-causeCyan" />
          <StatBox count={hackathonsCount} label="Hackathons Hosted" color="text-green-400" />
        </div>
      </section>

      {/* 3. MODULAR COMPONENTS */}
      <AboutSection />
      
      {/* 🚀 INSERTED ARCHIVE SECTION */}
      <ArchiveSection />

      <OperationsSection />
      <TeamSection />
      <ContactSection />

      {/* 4. FOOTER */}
      <footer className="w-full bg-[#020305] border-t border-[#00d2ff]/30 pt-16 pb-8 relative z-10 text-left mt-auto">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <a 
                href="https://www.charusat.ac.in/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-block transition-transform duration-300 ease-in-out hover:scale-105 hover:brightness-110"
              >
                <img src="/FINAL.png" alt="CFC" className="h-10 w-auto object-contain" />
              </a>
            </div>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed max-w-sm font-mono">
              Bridging the gap between hardware electronics and software engineering at CHARUSAT.
            </p>
          </div>

          <div>
            <h4 className="text-white font-mono font-bold mb-6 tracking-widest uppercase">System_Links</h4>
            <ul className="space-y-4 text-gray-400 text-sm font-mono">
              <li><a href="#home" onClick={(e) => scrollToId(e, 'home')} className="hover:text-[#00d2ff] transition-colors">{">"} ~/home</a></li>
              <li><a href="#about" onClick={(e) => scrollToId(e, 'about')} className="hover:text-[#00d2ff] transition-colors">{">"} ~/about</a></li>
              <li><a href="#archive" onClick={(e) => scrollToId(e, 'archive')} className="hover:text-[#50fa7b] transition-colors">{">"} ~/archive</a></li>
              <li><a href="#operations" onClick={(e) => scrollToId(e, 'operations')} className="hover:text-[#00d2ff] transition-colors">{">"} ~/operations</a></li>
              <li><a href="#team" onClick={(e) => scrollToId(e, 'team')} className="hover:text-[#00d2ff] transition-colors">{">"} ~/authorized_nodes</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-mono font-bold mb-6 tracking-widest uppercase">Node_Location</h4>
            <ul className="space-y-4 text-gray-400 text-sm font-mono mb-6">
              <li className="flex items-start gap-3">
                <span className="text-[#00d2ff]">@</span>
                <a href="mailto:root@codeforcause.tech" className="hover:text-[#00d2ff] hover:underline transition-colors">
                  root@codeforcause.tech
                </a>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#00d2ff]">📍</span>
                <span>Dept. of EC Engineering, CSPIT, CHARUSAT</span>
              </li>
            </ul>

            <div className="w-full h-44 rounded-xl overflow-hidden border border-white/10 transition-all duration-500 shadow-[0_0_15px_rgba(0,210,255,0.05)] hover:border-[#00d2ff]/40">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3683.746093120119!2d72.81735417616183!3d22.59959397947159!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x395e50c43cdea6c7%3A0x5074fe9e0c1c22a0!2sChandubhai%20S.%20Patel%20Institute%20of%20Technology!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="relative z-10 opacity-90 hover:opacity-100 transition-all duration-500"
              />
            </div>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto px-6 pt-8 border-t border-white/10 text-center text-gray-600 text-[10px] font-mono">
          <p>© 2026 Code for Cause. All systems operational. [ DESIGNED_BY_ROOT ]</p>
        </div>
      </footer>
      </main>
    </>
  );
}

const StatBox = ({ count, label, color }: any) => (
  <div className="flex flex-col items-center justify-center text-center px-4">
    <span className={`text-4xl md:text-5xl font-black font-mono mb-2 ${color}`}>{count}</span>
    <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-semibold leading-tight">{label}</span>
  </div>
);