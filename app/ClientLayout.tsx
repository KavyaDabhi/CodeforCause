"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
 
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [time, setTime] = useState("");
  const [activeSection, setActiveSection] = useState("home"); 
  const [menuOpen, setMenuOpen] = useState(false); // NEW
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
 
  // --- Admin Reroute ---
  useEffect(() => {
    const ADMIN_EMAIL = "23ec017@charusat.edu.in";
    if (status === "authenticated" && session?.user?.email === ADMIN_EMAIL) {
      if (pathname === "/" || pathname === "/login") {
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
 
  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
 
  const handleLogout = async () => {
    if (confirm("CRITICAL_ACTION: Terminate root session?")) {
      await signOut({ redirect: false });
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/"; 
    }
  };
 
  const scrollToSection = (id: string) => {
    setMenuOpen(false); // close menu on nav
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
      background: isActive ? 'rgba(0, 210, 255, 0.1)' : 'transparent',
      textDecoration: 'none',
      fontSize: '11px',
      fontWeight: 600,
      padding: '6px 10px',
      borderRadius: '4px',
      fontFamily: "monospace",
      transition: 'all 0.3s ease',
      border: isActive ? '1px solid #00d2ff' : '1px solid transparent',
      cursor: 'pointer',
    } as React.CSSProperties;
  };
 
  const navLinks = [
    { id: 'home',       label: 'Home' },
    { id: 'about',      label: 'About' },
    { id: 'operations', label: 'Events' },
    { id: 'team',       label: 'Team' },
    { id: 'contact',    label: 'Contact' },
  ];
 
  return (
    <div style={{ color: "#d1d5db", fontFamily: "monospace", minHeight: '100vh', backgroundColor: '#0a0b10' }}>
      
      {/* KALI TASKBAR */}
      <nav style={{
        minHeight: "50px", 
        backgroundColor: "#0f111a", 
        borderBottom: "1px solid #2a2e3f",
        display: "flex", 
        alignItems: "center", 
        padding: "5px 12px", 
        justifyContent: "space-between",
        position: "sticky", 
        top: 0, 
        zIndex: 1000,
        flexWrap: "nowrap",
      }}>
        
        {/* Left: Brand */}
        <button 
          onClick={() => scrollToSection('home')}
          style={{ display: "flex", alignItems: "center", gap: "8px", background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Image src="/CFC.png" alt="CFC" width={28} height={28} />
          <div style={{ color: "#fff", fontWeight: 900, fontSize: '13px', letterSpacing: '0.5px' }}>
            CODE_FOR_CAUSE <span style={{ color: '#00d2ff', opacity: 0.6 }}>$root</span>
          </div>
        </button>
 
        {/* Center: Desktop Nav */}
        <div className="hidden md:flex" style={{ gap: "4px" }}>
          {navLinks.map(link => (
            <button key={link.id} onClick={() => scrollToSection(link.id)} style={getNavItemStyle(link.id)}>
              {link.label}
            </button>
          ))}
        </div>
 
        {/* Right: Session + Hamburger */}
<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
  
  {session?.user?.email === "23ec017@charusat.edu.in" && (
    <div style={{
      fontSize: '9px', color: '#50fa7b', border: '1px solid #50fa7b',
      padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(80, 250, 123, 0.1)',
    }}>
      <span className="hidden sm:inline">SECURE_LINK: </span>ACTIVE
    </div>
  )}

  <span className="hidden lg:inline-block" style={{ color: '#50fa7b', fontSize: '11px', fontWeight: 'bold' }}>
    {time || "BOOTING..."}
  </span>
  
  {status === "authenticated" && session?.user ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <img 
        src={session.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.name || 'U')}&background=0f111a&color=00d2ff&bold=true&length=2`} 
        alt="User" 
        style={{ width: '26px', height: '26px', borderRadius: '50%', border: '2px solid #50fa7b', objectFit: 'cover' }}
      />
      <button 
        onClick={handleLogout}
        style={{
          border: '1px solid #ff5555', color: '#ff5555', padding: '4px 8px', 
          borderRadius: '4px', fontSize: '10px', fontWeight: 'bold',
          cursor: 'pointer', fontFamily: 'monospace', backgroundColor: 'transparent'
        }} 
      >
        <span className="hidden sm:inline">[ EXIT ]</span>
        <span className="sm:hidden">EXIT</span>
      </button>
    </div>
  ) : (
    <Link href="/login" style={{ textDecoration: 'none' }}>
      <div style={{ 
        border: '1px solid #50fa7b', color: '#50fa7b', padding: '4px 10px', 
        borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', fontFamily: 'monospace',
        backgroundColor: 'rgba(80, 250, 123, 0.05)'
      }}>
        [ ROOT_LOGIN ]
      </div>
    </Link>
  )}

  {/* Hamburger (mobile only) - FIXED DISPLAY CLASH */}
  <button
    onClick={() => setMenuOpen(prev => !prev)}
    // md:hidden now works because display:flex was moved from inline style to here
    className="flex md:hidden flex-col gap-[5px] p-1 border-none bg-none cursor-pointer"
    aria-label="Toggle menu"
    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
  >
    <span style={{
      display: 'block', width: '20px', height: '2px', backgroundColor: '#00d2ff',
      transition: 'all 0.3s',
      transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none',
    }} />
    <span style={{
      display: 'block', width: '20px', height: '2px', backgroundColor: '#00d2ff',
      transition: 'all 0.3s',
      opacity: menuOpen ? 0 : 1,
    }} />
    <span style={{
      display: 'block', width: '20px', height: '2px', backgroundColor: '#00d2ff',
      transition: 'all 0.3s',
      transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none',
    }} />
  </button>

</div>
      </nav>
 
      {/* Mobile Dropdown Menu */}
      <div
        className="md:hidden"
        style={{
          backgroundColor: '#0f111a',
          borderBottom: menuOpen ? '1px solid #2a2e3f' : 'none',
          overflow: 'hidden',
          maxHeight: menuOpen ? '300px' : '0px',
          opacity: menuOpen ? 1 : 0,
          transition: 'max-height 0.3s ease, opacity 0.3s ease',
          position: 'sticky',
          top: '50px',
          zIndex: 999,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', padding: '12px 16px', gap: '8px' }}>
          {navLinks.map(link => (
            <button
              key={link.id}
              onClick={() => scrollToSection(link.id)}
              style={{
                ...getNavItemStyle(link.id),
                fontSize: '13px',
                padding: '10px 12px',
                textAlign: 'left',
                width: '100%',
              }}
            >
              {`> ${link.label}`}
            </button>
          ))}
        </div>
      </div>
 
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