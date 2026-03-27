"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [time, setTime] = useState("");
  const [activeSection, setActiveSection] = useState("home"); 
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    const ADMIN_EMAIL = "23ec017@charusat.edu.in";
    if (status === "authenticated" && session?.user?.email === ADMIN_EMAIL) {
      if (pathname === "/" || pathname === "/login") {
        console.log("[ SYSTEM ]: Admin detected. Rerouting to Terminal_Admin...");
        router.push("/admin");
      }
    }
  }, [session, status, pathname, router]);

  // --- Clock Logic ---
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Handle cross-page scrolling ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scrollTo = params.get('scrollTo');
    if (scrollTo) {
      setTimeout(() => {
        document.getElementById(scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.replaceState({}, '', '/');
      }, 600);
    }
  }, [pathname]);

  // --- Live Scroll Tracking ---
  useEffect(() => {
    if (pathname !== '/') return;

    const handleScroll = () => {
      const sections = ['contact', 'team', 'operations', 'about', 'home'];
      const triggerPoint = window.innerHeight / 3;

      for (const id of sections) {
        const element = document.getElementById(id);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= triggerPoint) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  const handleLogout = async () => {
    if (confirm("CRITICAL_ACTION: Terminate root session and clear local cache?")) {
      await signOut({ redirect: false });
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/"; 
    }
  };

  const scrollToSection = (id: string) => {
    if (pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    } else {
      router.push(`/?scrollTo=${id}`);
    }
  };

  const getNavItemStyle = (id: string) => {
    const isActive = activeSection === id && pathname === '/';
    return {
      color: isActive ? '#00d2ff' : '#8b949e',
      // 🎯 CHANGED 'backgroundColor' to 'background' to match your hover logic
      background: isActive ? 'rgba(0, 210, 255, 0.1)' : 'transparent',
      textDecoration: 'none',
      fontSize: '12px',
      fontWeight: 600,
      padding: '6px 14px',
      borderRadius: '4px',
      fontFamily: "monospace",
      transition: 'all 0.3s ease',
      border: isActive ? '1px solid #00d2ff' : '1px solid transparent',
      boxShadow: isActive ? '0 0 10px rgba(0,210,255,0.2)' : 'none',
      cursor: 'pointer',
    } as React.CSSProperties;
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    if (activeSection !== id || pathname !== '/') {
      e.currentTarget.style.color = '#00d2ff';
      // 🎯 Use .background here too
      e.currentTarget.style.background = 'rgba(0,210,255,0.05)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    if (activeSection !== id || pathname !== '/') {
      e.currentTarget.style.color = '#8b949e';
      // 🎯 Use .background here too
      e.currentTarget.style.background = 'transparent';
    }
  };

  return (
    <div style={{ color: "#d1d5db", fontFamily: "monospace", minHeight: '100vh', backgroundColor: '#0a0b10' }}>
      
      {/* KALI SYSTEM TASKBAR */}
      <nav style={{
        height: "50px", 
        backgroundColor: "#0f111a", 
        borderBottom: "1px solid #2a2e3f",
        display: "flex", 
        alignItems: "center", 
        padding: "0 16px", 
        justifyContent: "space-between",
        position: "sticky", 
        top: 0, 
        zIndex: 1000, 
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
      }}>
        
        {/* Left: Brand Identity (Now pinned to left) */}
        <button 
          onClick={() => scrollToSection('home')}
          style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Image
            src="/CFC.png"
            alt="Code for Cause Logo"
            width={32}
            height={32}
            style={{ borderRadius: '8px', objectFit: 'contain' }}
          />
          <div style={{ color: "#fff", fontWeight: 900, fontSize: '14px', letterSpacing: '0.5px' }}>
            CODE_FOR_CAUSE <span style={{ color: '#00d2ff', opacity: 0.6 }}>$root</span>
          </div>
        </button>

        {/* Center: Navigation */}
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={() => scrollToSection('home')} style={getNavItemStyle('home')} onMouseEnter={(e) => handleMouseEnter(e, 'home')} onMouseLeave={(e) => handleMouseLeave(e, 'home')}>Home</button>
          <button onClick={() => scrollToSection('about')} style={getNavItemStyle('about')} onMouseEnter={(e) => handleMouseEnter(e, 'about')} onMouseLeave={(e) => handleMouseLeave(e, 'about')}>About</button>
          <button onClick={() => scrollToSection('operations')} style={getNavItemStyle('operations')} onMouseEnter={(e) => handleMouseEnter(e, 'operations')} onMouseLeave={(e) => handleMouseLeave(e, 'operations')}>Events</button>
          <button onClick={() => scrollToSection('team')} style={getNavItemStyle('team')} onMouseEnter={(e) => handleMouseEnter(e, 'team')} onMouseLeave={(e) => handleMouseLeave(e, 'team')}>Team</button>
          <button onClick={() => scrollToSection('contact')} style={getNavItemStyle('contact')} onMouseEnter={(e) => handleMouseEnter(e, 'contact')} onMouseLeave={(e) => handleMouseLeave(e, 'contact')}>Contact</button>
        </div>

        {/* Right: Security & Time */}
<div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
  
  {/* ADMIN BADGE */}
  {session?.user?.email === "23ec017@charusat.edu.in" && (
    <div style={{
      fontSize: '9px',
      color: '#50fa7b',
      border: '1px solid #50fa7b',
      padding: '2px 8px',
      borderRadius: '4px',
      backgroundColor: 'rgba(80, 250, 123, 0.1)',
      fontWeight: 'bold',
      letterSpacing: '1px'
    }}>
      SECURE_LINK: ACTIVE
    </div>
  )}

  <span className="hidden md:inline-block" style={{ color: '#50fa7b', fontSize: '11px', fontWeight: 'bold' }}>
    {time || "BOOTING..."}
  </span>
  
  {status === "authenticated" && session?.user ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <img 
        // 🎯 FIX: If user.image is missing (Credentials login), generate a UI Avatar
        src={session.user.image || `https://ui-avatars.com/api/?name=${session.user.name || 'Admin'}&background=0f111a&color=00d2ff&bold=true`} 
        alt="User Session" 
        style={{ 
          width: '28px', 
          height: '28px', 
          borderRadius: '50%', 
          border: '2px solid #50fa7b', 
          padding: '2px', 
          objectFit: 'cover' 
        }}
        // 🎯 EXTRA SAFETY: If the image URL itself fails to load
        onError={(e) => {
          (e.target as HTMLImageElement).src = "https://ui-avatars.com/api/?name=Root&background=0f111a&color=ff5555";
        }}
      />
      <button 
        onClick={handleLogout}
        style={{
          backgroundColor: 'rgba(255, 85, 85, 0.05)',
          border: '1px solid #ff5555',
          color: '#ff5555',
          padding: '6px 14px', 
          borderRadius: '6px', 
          fontSize: '11px', 
          fontWeight: 'bold',
          cursor: 'pointer', 
          fontFamily: 'monospace', 
          transition: 'all 0.3s ease',
        }} 
      >
        [ ROOT_EXIT ]
      </button>
    </div>
  ) : (
    <Link href="/login" style={{ textDecoration: 'none' }}>
      <div style={{ 
        backgroundColor: 'rgba(80, 250, 123, 0.1)', 
        border: '1px solid #50fa7b', 
        color: '#50fa7b', 
        padding: '6px 14px', 
        borderRadius: '6px', 
        fontSize: '11px', 
        fontWeight: 'bold', 
        cursor: 'pointer', 
        fontFamily: 'monospace' 
      }}>
        [ ROOT_LOGIN ]
      </div>
    </Link>
  )}
</div>
      </nav>

      {/* SCANLINES OVERLAY */}
      <div style={{ 
        position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", 
        background: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.02) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.01), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.01))", 
        backgroundSize: "100% 4px, 3px 100%", zIndex: 9999, pointerEvents: "none" 
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}