"use client";
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const softwareLogs = [
  "[    0.000000] Linux version 6.8.11-kali2-amd64 (Code_For_Cause_Node)",
  "[    0.043012] kernel/system: Initializing EC_Department architecture...",
  "[    0.102341] [ OK ] Started Network Manager.",
  "[    0.403912] [ OK ] Reached target Network.",
  "[    0.600123] Mounting /root/Code_For_Cause/UI...",
  "[    0.803412] Starting Graphical Interface...",
];

const hardwareLogs = [
  "> Connecting to /dev/ttyUSB0...",
  "> esptool.py v4.2.1 - ESP32-WROOM-32",
  "> Chip is ESP32-D0WDQ6 (revision 1)",
  "> Features: WiFi, BT, Dual Core, 240MHz",
  "> Erasing flash...",
  "> Writing at 0x00010000...",
  "> Hash of data verified.",
  "> Hard resetting via RTS pin...",
  "> SYSTEM_READY: EXEC_V2.0"
];

export default function KaliBoot({ onComplete }: { onComplete: () => void }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [phase, setPhase] = useState<'software' | 'hardware'>('software');
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isActive, setIsActive] = useState(false); // 🎯 Added this to control if it plays

  // 🎯 1. THE CACHE MEMORY CHECK
  useEffect(() => {
    setMounted(true);
    
    // Check the browser's local storage
    const hasBootedBefore = localStorage.getItem("cfc_global_boot_played");
    
    if (hasBootedBefore) {
      // They have been to the site before -> Instantly skip
      onComplete();
    } else {
      // First time visitor -> Save to memory and start the animation
      localStorage.setItem("cfc_global_boot_played", "true");
      setIsActive(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🎯 2. THE ANIMATION LOGIC (Only runs if active)
  useEffect(() => {
    if (!isActive) return;

    if (phase === 'software') {
      let i = 0;
      const interval = setInterval(() => {
        if (i < softwareLogs.length) {
          setLogs(prev => [...prev, softwareLogs[i]]);
          i++;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            setPhase('hardware');
            setLogs([]); 
          }, 800);
        }
      }, 200);
      return () => clearInterval(interval);
    } else {
      let i = 0;
      const interval = setInterval(() => {
        if (i < hardwareLogs.length) {
          const currentLog = hardwareLogs[i];
          setLogs(prev => [...prev, currentLog]);
          
          if (currentLog.includes("Writing")) {
            let p = 0;
            const pInterval = setInterval(() => {
              if (p <= 100) {
                setProgress(p);
                p += 10;
              } else {
                clearInterval(pInterval);
              }
            }, 50);
          }
          i++;
        } else {
          clearInterval(interval);
          setTimeout(() => onComplete(), 1200);
        }
      }, 400);
      return () => clearInterval(interval);
    }
  }, [phase, onComplete, isActive]);

  // 🎯 3. SAFETY BYPASS (Only listens if active)
  useEffect(() => {
    if (!isActive) return;

    const handleBypass = () => onComplete();
    window.addEventListener('keydown', handleBypass);
    window.addEventListener('click', handleBypass);
    return () => {
      window.removeEventListener('keydown', handleBypass);
      window.removeEventListener('click', handleBypass);
    };
  }, [onComplete, isActive]);

  // If we are skipping, do not render the black screen at all
  if (!mounted || !isActive) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-[#0a0b10] text-[#00d2ff] font-mono p-6 md:p-12 flex flex-col justify-center items-center overflow-hidden">
      <div className="w-full max-w-2xl border border-[#00d2ff]/20 bg-black/50 p-6 rounded-lg shadow-[0_0_30px_rgba(0,210,255,0.1)]">
        
        <div className="flex gap-2 mb-4 border-b border-[#00d2ff]/10 pb-2">
            <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
            <span className="text-[10px] ml-2 opacity-40 uppercase tracking-widest">
                {phase === 'software' ? 'Kernel_Boot_Sequence' : 'Firmware_Flash_Protocol'}
            </span>
        </div>

        <div className="min-h-[280px]">
          {logs.map((log, index) => (
            <p key={index} className={`text-xs md:text-sm mb-1 ${log && log.includes('[ OK ]') ? 'text-[#50fa7b]' : 'text-[#00d2ff] opacity-80'}`}>
              {log}
            </p>
          ))}
          
          {phase === 'hardware' && progress > 0 && (
            <div className="mt-4 animate-fadeIn">
               <div className="flex justify-between text-[10px] mb-1 text-[#50fa7b]">
                 <span>FLASHING_MEM_ADDR_0x0001</span>
                 <span>{progress}%</span>
               </div>
               <div className="w-full h-1.5 bg-[#00d2ff]/10 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-[#50fa7b] transition-all duration-100 shadow-[0_0_10px_#50fa7b]" 
                   style={{ width: `${progress}%` }}
                 ></div>
               </div>
            </div>
          )}
          
          <div className="w-2 h-4 bg-[#00d2ff] animate-pulse mt-4"></div>
        </div>
      </div>

      <div className="mt-12 text-gray-600 text-[10px] uppercase tracking-[0.3em] animate-pulse">
        [ Link Established: Press any key to skip ]
      </div>
    </div>,
    document.body
  );
}