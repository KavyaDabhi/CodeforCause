"use client"; 
import { useEffect, useState } from 'react'; 
import Link from 'next/link';
import { motion } from 'framer-motion'; // 🚀 Added Framer Motion
import { useSecretCommand } from '@/app/hooks/useSecretCommand'; // 🚀 Added secret hook
import { useGotham } from '@/app/context/GothamContext';
// COMPONENT IMPORTS
import KaliBoot from '@/components/KaliBoot';
import BackgroundTraces from '@/components/BackgroundTraces';

// SECTION IMPORTS
import AboutSection from '@/components/sections/About';
import ArchiveSection from '@/components/sections/Archive';
import OperationsSection from '@/components/sections/Operations';
import TeamSection from '@/components/sections/Team';
import ContactSection from '@/components/sections/Contact';

let hasBooted = false;

export default function Home() {
  const [isBooting, setIsBooting] = useState(true);
  

  // 🦇 Listen for the word "gotham" anywhere on the page
  
  const { isGothamMode } = useGotham();

  const handleBootComplete = () => {
    hasBooted = true;      
    setIsBooting(false);   
  };

  const activeNodesCount = "04"; 
  const totalParticipants = "256"; 
  const curatedEventsCount = "04"; 
  const hackathonsCount = "03"; 

  // Handles ?scrollTo= param (used by navbar + dashboard links)
  useEffect(() => {
    if (!isBooting) {
      const params = new URLSearchParams(window.location.search);
      const scrollTo = params.get('scrollTo');
      if (scrollTo) {
        setTimeout(() => {
          document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

      {/* Main container transitions to an absolute pitch black in Gotham mode */}
      <main 
        className={`flex min-h-screen flex-col items-center justify-start relative transition-opacity duration-1000 ${isBooting ? 'opacity-0 h-screen overflow-hidden' : 'opacity-100 overflow-x-hidden'}`}
        style={{ backgroundColor: isGothamMode ? '#000000' : '#05060a', transition: 'background-color 1.5s ease-in-out' }}
      >
      <BackgroundTraces />

      {/* 1. HERO SECTION WRAPPED IN MOTION */}
      <motion.section 
        id="home" 
        className="relative w-full flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-8 text-center scroll-mt-20"
        animate={{ backgroundColor: isGothamMode ? '#000000' : 'transparent' }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      >
        {/* Gritty Film Grain Overlay */}
        {isGothamMode && (
          <div 
            className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-overlay"
            style={{ backgroundImage: `url('https://upload.wikimedia.org/wikipedia/commons/7/76/1k_Dissolve_Noise_Texture.png')` }} 
          />
        )}

        {/* Dynamic Grid Background */}
        <motion.div 
          className="absolute inset-0 pointer-events-none z-0"
          animate={{
            opacity: isGothamMode ? 0.05 : 0.10,
            backgroundImage: isGothamMode 
              ? `linear-gradient(rgba(220, 38, 38, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(220, 38, 38, 0.2) 1px, transparent 1px)`
              : `linear-gradient(rgba(0, 210, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 210, 255, 0.2) 1px, transparent 1px)`
          }}
          style={{ backgroundSize: '40px 40px', maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)' }} 
        />
        
        {/* Dynamic Center Glow: Changes from Blue to Deep Crimson */}
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[600px] h-[400px] md:h-[600px] blur-[100px] rounded-full pointer-events-none -z-10"
          animate={{ backgroundColor: isGothamMode ? 'rgba(153, 27, 27, 0.15)' : 'rgba(0, 210, 255, 0.1)' }}
          transition={{ duration: 2 }}
        />

        <div className="flex justify-center mb-6 mt-4 relative z-50 animate-fadeUp">
          <a href="https://www.charusat.ac.in/" target="_blank" rel="noopener noreferrer" className="block">
            <img 
              src="/FINAL.png" 
              alt="Institution Logos" 
              className="h-20 w-auto object-contain cursor-pointer transition-all duration-700 ease-in-out hover:scale-105" 
              style={{ filter: isGothamMode ? 'grayscale(100%) contrast(150%) brightness(0.8)' : 'none' }} 
            />
          </a>
        </div>

        <div className="flex flex-col items-center justify-center mb-10 z-10 relative">
          <motion.span 
            className="text-xl md:text-2xl tracking-tight mb-10 block font-bold font-mono"
            animate={{ color: isGothamMode ? '#dc2626' : '#00d2ff' }}
            transition={{ duration: 1 }}
          >
            {isGothamMode ? "root@cfc:~# ./gotham_protocol.sh --force" : "root@cfc:~# ./initialize_system.sh"}
          </motion.span>
          
          <div className="flex flex-row items-center justify-center gap-1 mb-10">
            <motion.div 
              className="w-16 h-16 md:w-24 md:h-24 rounded-xl flex items-center justify-center shadow-lg transform -skew-x-12 translate-y-3 md:translate-y-4 relative overflow-hidden"
              animate={{ backgroundColor: isGothamMode ? '#7f1d1d' : '#00d2ff' }}
              transition={{ duration: 1 }}
            >
              <span className="text-brandBase text-4xl md:text-6xl font-mono font-bold leading-none transform skew-x-12 pb-1 relative z-10">{"<"}</span>
              <div className="absolute inset-0 bg-white/10 [clip-path:polygon(0_0,100%_0,100%_20%,0_70%)]"></div>
            </motion.div>
            <motion.div 
              className="w-16 h-16 md:w-24 md:h-24 rounded-xl flex items-center justify-center shadow-lg transform -skew-x-12 -translate-y-3 md:-translate-y-4 relative overflow-hidden"
              animate={{ backgroundColor: isGothamMode ? '#450a0a' : '#00f0ff' }}
              transition={{ duration: 1 }}
            >
              <span className="text-brandBase text-4xl md:text-6xl font-mono font-bold leading-none transform skew-x-12 pb-1 relative z-10">{">"}</span>
              <div className="absolute inset-0 bg-white/10 [clip-path:polygon(0_0,100%_0,100%_20%,0_70%)]"></div>
            </motion.div>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-widest text-brandText uppercase mb-4 drop-shadow-2xl">Code for Cause</h1>
          <motion.p 
            className="text-sm md:text-base uppercase tracking-[0.4em] md:tracking-[0.6em] font-mono"
            animate={{ color: isGothamMode ? '#9ca3af' : '#9ca3af' }}
          >
            [ <motion.span animate={{ color: isGothamMode ? '#ef4444' : '#00f0ff' }} className="font-bold">
                {isGothamMode ? "PROTOCOL: GOTHAM" : "STATUS: ONLINE"}
              </motion.span> ]
          </motion.p>
        </div>

        <motion.div 
          className="max-w-2xl text-lg text-gray-400 mb-12 leading-relaxed px-4 font-mono text-left p-4 rounded-xl border z-10"
          animate={{ 
            backgroundColor: isGothamMode ? 'rgba(0,0,0,0.5)' : 'rgba(15,23,42,0.2)',
            borderColor: isGothamMode ? 'rgba(220, 38, 38, 0.2)' : 'rgba(255,255,255,0.05)'
          }}
          transition={{ duration: 1 }}
        >
          <motion.span animate={{ color: isGothamMode ? '#ef4444' : '#50fa7b' }} className="font-bold">guest@kali:~$</motion.span> cat mission_statement.txt <br/>
          <span className="text-gray-300 opacity-90 mt-2 block">{">"} Empowering students at CHARUSAT to build, develop, and excel in the world of code and hardware.</span>
        </motion.div>

        <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 md:gap-6 z-10">
          <motion.a 
            href="#operations" 
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => scrollToId(e, 'operations')} 
            className="group flex items-center justify-center gap-2 px-8 py-4 text-brandBase rounded-xl font-extrabold text-lg hover:bg-white transition-all duration-300"
            animate={{ 
              backgroundColor: isGothamMode ? '#991b1b' : '#00f0ff',
              boxShadow: isGothamMode ? '0 0 20px rgba(153,27,27,0.4)' : '0 0 20px rgba(0,210,255,0.4)'
            }}
          >
            View Operations
          </motion.a>
          <a href="#about" onClick={(e: React.MouseEvent<HTMLAnchorElement>) => scrollToId(e, 'about')} className="group flex items-center justify-center gap-2 px-8 py-4 bg-transparent text-gray-300 border border-brandCard hover:border-codeBlue hover:text-codeBlue rounded-xl font-semibold text-lg transition-all duration-300 font-mono">
            WHO_ARE_WE?
          </a>
          <motion.a 
            href="#archive" 
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => scrollToId(e, 'archive')} 
            className="group flex items-center justify-center gap-2 px-8 py-4 bg-transparent border rounded-xl font-semibold text-lg transition-all duration-300 font-mono"
            animate={{
              color: isGothamMode ? '#ef4444' : '#50fa7b',
              borderColor: isGothamMode ? 'rgba(239,68,68,0.3)' : 'rgba(80,250,123,0.3)',
            }}
            whileHover={{
              borderColor: isGothamMode ? '#ef4444' : '#50fa7b',
              boxShadow: isGothamMode ? '0 0 15px rgba(239,68,68,0.2)' : '0 0 15px rgba(80,250,123,0.2)'
            }}
          >
            MISSION_ARCHIVE
          </motion.a>
        </div>
      </motion.section>

      {/* 2. DYNAMIC STATS STRIP */}
      <motion.section 
        className="w-full border-y py-12 relative z-10"
        animate={{ 
          backgroundColor: isGothamMode ? 'rgba(0,0,0,0.8)' : 'rgba(15,23,42,0.1)',
          borderColor: isGothamMode ? 'rgba(220,38,38,0.1)' : 'rgba(255,255,255,0.05)'
        }}
      >
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/5">
          <StatBox count={activeNodesCount} label="Active Nodes (Admins)" color={isGothamMode ? "text-red-500" : "text-green-400"} />
          <StatBox count={curatedEventsCount} label="Curated Events" color={isGothamMode ? "text-gray-400" : "text-codeBlue"} />
          <StatBox count={totalParticipants + "+"} label="Total Participants" color={isGothamMode ? "text-red-600" : "text-causeCyan"} />
          <StatBox count={hackathonsCount} label="Hackathons Hosted" color={isGothamMode ? "text-red-500" : "text-green-400"} />
        </div>
      </motion.section>

      {/* 3. MODULAR COMPONENTS */}
      <AboutSection />
      <ArchiveSection />
      <OperationsSection />
      <TeamSection />
      <ContactSection />

      {/* 4. FOOTER */}
      <footer className="w-full bg-[#020305] border-t border-[#00d2ff]/30 pt-16 pb-8 relative z-10 text-left mt-auto">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <a href="https://www.charusat.ac.in/" target="_blank" rel="noopener noreferrer" className="inline-block transition-transform duration-300 ease-in-out hover:scale-105 hover:brightness-110">
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
    <span className={`text-4xl md:text-5xl font-black font-mono mb-2 transition-colors duration-1000 ${color}`}>{count}</span>
    <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-semibold leading-tight">{label}</span>
  </div>
);