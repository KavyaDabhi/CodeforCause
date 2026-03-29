"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const ADMIN_EMAIL = "23ec017@charusat.edu.in";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [time, setTime] = useState("");
  const [activeSection, setActiveSection] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [shouldHideForModal, setShouldHideForModal] = useState(false);
  const [customName, setCustomName] = useState<string | null>(null);

  // ── Profile dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  // ── Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Fetch custom name from Firestore
  useEffect(() => {
    const fetchCustomName = async () => {
      if (session?.user?.email && !session?.user?.image) {
        try {
          const q = query(collection(db, "users"), where("email", "==", session.user.email));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            setCustomName(data.displayName || data.FULL_NAME || data.name || null);
          }
        } catch (error) {
          console.error("Failed to fetch operative identity:", error);
        }
      }
    };
    fetchCustomName();
  }, [session]);

  // ── Scroll & modal detection
  useEffect(() => {
    const handleScrollAndModal = () => {
      setIsScrolled(window.scrollY > 50);
      setShouldHideForModal(document.body.style.overflow === "hidden");
      if (pathname !== "/") return;
      const sections = ["contact", "team", "operations", "about", "home"];
      const triggerPoint = window.innerHeight / 3;
      for (const id of sections) {
        const element = document.getElementById(id);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= triggerPoint) { setActiveSection(id); break; }
        }
      }
    };
    const interval = setInterval(handleScrollAndModal, 100);
    window.addEventListener("scroll", handleScrollAndModal);
    return () => { window.removeEventListener("scroll", handleScrollAndModal); clearInterval(interval); };
  }, [pathname]);

  // ── Terminal clock
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); setDropdownOpen(false); }, [pathname]);

  const handleLogout = async () => {
    if (confirm("CRITICAL_ACTION: Terminate root session?")) {
      await signOut({ redirect: false });
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
    }
  };

  const scrollToSection = (id: string) => {
    setMenuOpen(false);
    if (pathname === "/") {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
    } else {
      router.push(`/?scrollTo=${id}`);
    }
  };

  const getNavItemStyle = (id: string) => {
    const isActive = activeSection === id && pathname === "/";
    return {
      color: isActive ? "#00d2ff" : "#8b949e",
      background: isActive ? "rgba(0, 210, 255, 0.1)" : "transparent",
      textDecoration: "none",
      fontSize: "11px",
      fontWeight: 600,
      padding: "6px 10px",
      borderRadius: "4px",
      fontFamily: "monospace",
      transition: "all 0.3s ease",
      border: isActive ? "1px solid #00d2ff" : "1px solid transparent",
      cursor: "pointer",
    } as React.CSSProperties;
  };

  const navLinks = [
    { id: "home", label: "Home" },
    { id: "about", label: "About" },
    { id: "operations", label: "Events" },
    { id: "team", label: "Team" },
    { id: "contact", label: "Contact" },
  ];

  const isAdminPage = pathname === "/admin" || pathname === "/login";
  const finalName = customName || session?.user?.name || session?.user?.email?.split("@")[0] || "U";
  const avatarSrc = session?.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(finalName)}&background=0f111a&color=00d2ff&bold=true`;

  return (
    <div style={{ color: "#d1d5db", fontFamily: "monospace", minHeight: "100vh", backgroundColor: "#05060a" }}>

      {!isAdminPage && (
        <>
          <nav style={{
            width: isScrolled ? "92%" : "100%",
            maxWidth: isScrolled ? "1200px" : "100%",
            height: "50px",
            backgroundColor: isScrolled ? "rgba(15, 17, 26, 0.85)" : "#0f111a",
            backdropFilter: isScrolled ? "blur(16px)" : "none",
            border: isScrolled ? "1px solid rgba(0, 210, 255, 0.3)" : "1px solid #2a2e3f",
            borderRadius: isScrolled ? "16px" : "0px",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            justifyContent: "space-between",
            position: "fixed",
            top: shouldHideForModal ? "-100px" : (isScrolled ? "15px" : "0px"),
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            transition: "all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            boxShadow: isScrolled ? "0 10px 40px rgba(0,0,0,0.6)" : "none",
            opacity: shouldHideForModal ? 0 : 1,
            pointerEvents: shouldHideForModal ? "none" : "auto",
          }}>

            <button onClick={() => scrollToSection("home")} style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer" }}>
              <Image src="/CFC.png" alt="CFC" width={26} height={26} />
              <div style={{ color: "#fff", fontWeight: 900, fontSize: "13px", letterSpacing: "0.5px" }}>
                CODE_FOR_CAUSE <span className="hidden sm:inline" style={{ color: "#00d2ff", opacity: 0.6 }}>$root</span>
              </div>
            </button>

            <div className="hidden md:flex" style={{ gap: "4px" }}>
              {navLinks.map(link => (
                <button key={link.id} onClick={() => scrollToSection(link.id)} style={getNavItemStyle(link.id)}>
                  {link.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span className="hidden lg:inline-block" style={{ color: "#50fa7b", fontSize: "11px", fontWeight: "bold" }}>
                {time || "BOOTING..."}
              </span>

              {status === "authenticated" && session?.user ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

                  {/* ── PROFILE DROPDOWN ─────────────────────────── */}
                  <div ref={dropdownRef} style={{ position: "relative" }}>
                    <button
                      onClick={() => setDropdownOpen(o => !o)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                    >
                      <img
                        src={avatarSrc}
                        alt="Profile"
                        referrerPolicy="no-referrer"
                        style={{
                          width: "28px", height: "28px", borderRadius: "50%",
                          border: dropdownOpen ? "2px solid #00d2ff" : "2px solid #50fa7b",
                          objectFit: "cover",
                          transition: "border-color 0.2s, box-shadow 0.2s",
                          boxShadow: dropdownOpen ? "0 0 10px rgba(0,210,255,0.6)" : "none",
                        }}
                      />
                    </button>

                    {/* Dropdown panel */}
                    {dropdownOpen && (
                      <div style={{
                        position: "absolute", top: "calc(100% + 10px)", right: 0,
                        backgroundColor: "#0f111a",
                        border: "1px solid rgba(0,210,255,0.2)",
                        borderRadius: "12px",
                        minWidth: "180px",
                        boxShadow: "0 16px 40px rgba(0,0,0,0.7)",
                        overflow: "hidden",
                        zIndex: 2000,
                        animation: "fadeSlideIn 0.15s ease forwards",
                      }}>
                        {/* User info */}
                        <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <p style={{ fontSize: "11px", fontWeight: 900, color: "#fff", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {finalName}
                          </p>
                          <p style={{ fontSize: "9px", color: "#50fa7b", margin: "2px 0 0", opacity: 0.7, textTransform: "uppercase" }}>
                            {isAdmin ? "SUPER_ADMIN" : "OPERATIVE"}
                          </p>
                        </div>

                        {/* Dashboard */}
                        <Link
                          href="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          style={{ textDecoration: "none" }}
                        >
                          <div style={dropdownItemStyle("#00d2ff")}>
                            <span style={{ fontSize: "14px" }}>⌘</span>
                            <span>Dashboard</span>
                          </div>
                        </Link>

                        {/* Admin Panel — only for admin */}
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setDropdownOpen(false)}
                            style={{ textDecoration: "none" }}
                          >
                            <div style={dropdownItemStyle("#ffb86c")}>
                              <span style={{ fontSize: "14px" }}>⚡</span>
                              <span>Admin Panel</span>
                            </div>
                          </Link>
                        )}

                        {/* Divider */}
                        <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "4px 0" }} />

                        {/* Logout */}
                        <button
                          onClick={() => { setDropdownOpen(false); handleLogout(); }}
                          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                        >
                          <div style={dropdownItemStyle("#ff5555")}>
                            <span style={{ fontSize: "14px" }}>⏻</span>
                            <span>Root Exit</span>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                  {/* ── END DROPDOWN ──────────────────────────────── */}

                </div>
              ) : (
                <Link href="/login" style={{ textDecoration: "none" }}>
                  <div style={{ border: "1px solid #50fa7b", color: "#50fa7b", padding: "4px 10px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", fontFamily: "monospace", backgroundColor: "rgba(80, 250, 123, 0.05)" }}>
                    [ ROOT_LOGIN ]
                  </div>
                </Link>
              )}

              {/* Mobile hamburger */}
              <button onClick={() => setMenuOpen(!menuOpen)} className="flex md:hidden flex-col gap-[5px] p-1 border-none bg-none cursor-pointer">
                <span style={{ display: "block", width: "20px", height: "2px", backgroundColor: "#00d2ff", transition: "all 0.3s", transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
                <span style={{ display: "block", width: "20px", height: "2px", backgroundColor: "#00d2ff", transition: "all 0.3s", opacity: menuOpen ? 0 : 1 }} />
                <span style={{ display: "block", width: "20px", height: "2px", backgroundColor: "#00d2ff", transition: "all 0.3s", transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
              </button>
            </div>
          </nav>

          {/* MOBILE DROPDOWN */}
          <div
            className="md:hidden"
            style={{
              position: "fixed",
              top: isScrolled ? "75px" : "55px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "92%",
              backgroundColor: "rgba(15, 17, 26, 0.95)",
              backdropFilter: "blur(20px)",
              borderRadius: "16px",
              border: "1px solid rgba(0, 210, 255, 0.2)",
              maxHeight: menuOpen ? "400px" : "0px",
              opacity: menuOpen ? 1 : 0,
              overflow: "hidden",
              pointerEvents: menuOpen ? "auto" : "none",
              transition: "all 0.4s ease-in-out",
              zIndex: 999,
              display: shouldHideForModal ? "none" : "block",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", padding: "16px", gap: "8px" }}>
              {navLinks.map(link => (
                <button key={link.id} onClick={() => scrollToSection(link.id)} style={{ ...getNavItemStyle(link.id), fontSize: "13px", padding: "12px", textAlign: "left", width: "100%" }}>
                  {`> ${link.label}`}
                </button>
              ))}

              {/* Mobile: auth links */}
              {status === "authenticated" && (
                <>
                  <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)} style={{ textDecoration: "none" }}>
                    <div style={{ ...getNavItemStyle(""), fontSize: "13px", padding: "12px", color: "#00d2ff", border: "1px solid rgba(0,210,255,0.2)" }}>⌘ Dashboard</div>
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setMenuOpen(false)} style={{ textDecoration: "none" }}>
                      <div style={{ ...getNavItemStyle(""), fontSize: "13px", padding: "12px", color: "#ffb86c", border: "1px solid rgba(255,184,108,0.2)" }}>⚡ Admin Panel</div>
                    </Link>
                  )}
                  <button onClick={handleLogout} style={{ ...getNavItemStyle(""), fontSize: "13px", padding: "12px", textAlign: "left", width: "100%", color: "#ff5555", border: "1px solid rgba(255,85,85,0.2)" }}>
                    ⏻ Root Exit
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* GLOBAL SCANLINE OVERLAY */}
      <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.02) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.01), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.01))", backgroundSize: "100% 4px, 3px 100%", zIndex: 9999, pointerEvents: "none" }} />

      <style>{`
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}

// ── Dropdown item style helper
const dropdownItemStyle = (color: string): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px 14px",
  fontSize: "11px",
  fontWeight: 700,
  fontFamily: "monospace",
  color,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  cursor: "pointer",
  transition: "background 0.15s",
  backgroundColor: "transparent",
});