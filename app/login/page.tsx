"use client";
import { useState, Suspense } from "react";
import { signIn as nextAuthSignIn } from "next-auth/react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

function LoginContent() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      let emailToAuth = identifier.trim();

      if (!emailToAuth.includes("@")) {
        const q = query(collection(db, "users"), where("displayName", "==", emailToAuth));
        const snap = await getDocs(q);
        if (snap.empty) {
          setErrorMsg("ACCESS_DENIED: IDENTITY_NOT_FOUND");
          setLoading(false);
          return;
        }
        emailToAuth = snap.docs[0].data().email;
      }

      const userCredential = await signInWithEmailAndPassword(auth, emailToAuth, password);
      const firebaseUser = userCredential.user;

      const result = await nextAuthSignIn("credentials", {
        email: firebaseUser.email,
        password: password,
        redirect: false,
      });

      if (result?.error) {
        setErrorMsg("SESSION_SYNC_ERROR: " + result.error.toUpperCase());
        setLoading(false);
        return;
      }

      setTimeout(() => { window.location.href = "/"; }, 150);

    } catch (error: any) {
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        setErrorMsg("ACCESS_DENIED: INVALID_CREDENTIALS");
      } else {
        setErrorMsg("SYSTEM_ERROR: " + error.message.toUpperCase());
      }
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "calc(100vh - 50px)", backgroundColor: "#050A14", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{
        width: "100%", maxWidth: "450px", backgroundColor: "#0B111A",
        border: `1px solid ${errorMsg ? "#ff5555" : "rgba(0,210,255,0.2)"}`,
        borderRadius: "24px", padding: "48px 32px", textAlign: "center",
        transition: "all 0.3s ease",
        boxShadow: errorMsg ? "0 0 20px rgba(255, 85, 85, 0.1)" : "none"
      }}>

        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "inline-block", padding: "8px 20px", border: "2px solid #00d2ff", color: "#00d2ff", fontWeight: 900, fontFamily: "monospace" }}>
            CODE_FOR_CAUSE
          </div>
        </div>

        <h1 style={{ fontSize: "24px", fontWeight: 900, color: "#fff", marginBottom: "8px" }}>Root Access</h1>

        {errorMsg && (
          <div style={{
            color: "#ff5555", backgroundColor: "rgba(255, 85, 85, 0.1)",
            border: "1px solid #ff5555", padding: "10px", fontSize: "11px",
            fontWeight: "bold", fontFamily: "monospace", marginTop: "20px",
            borderRadius: "8px", animation: "shake 0.4s ease-in-out"
          }}>
            [!] {errorMsg}
          </div>
        )}

        <form onSubmit={handleEmailSignIn} style={{ textAlign: "left", marginTop: errorMsg ? "15px" : "30px" }}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ color: "#fff", fontSize: "10px", display: "block", marginBottom: "8px", opacity: 0.6 }}>
              IDENTITY (EMAIL_OR_FULL_NAME)
            </label>
            <input
              type="text"
              required
              onChange={e => setIdentifier(e.target.value)}
              style={inputStyle}
              placeholder="user@email.com or Full Name"
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ color: "#fff", fontSize: "10px", display: "block", marginBottom: "8px", opacity: 0.6 }}>
              ACCESS_KEY
            </label>
            {/* Password field with toggle */}
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                required
                onChange={e => setPassword(e.target.value)}
                style={{ ...inputStyle, paddingRight: "44px" }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: "absolute", right: "12px", top: "50%",
                  transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: showPassword ? "#00d2ff" : "#444",
                  fontSize: "16px", lineHeight: 1,
                  transition: "color 0.2s",
                  padding: "4px",
                }}
                tabIndex={-1}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  // Eye-off icon
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  // Eye icon
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <p style={{ color: "#444", fontSize: "9px", marginBottom: "30px", paddingLeft: "5px" }}>
            [ REQ: 8+ Chars, 1 Upper, 1 Number, 1 Special (!@#) ]
          </p>

          <button type="submit" disabled={loading} style={primaryBtn}>
            {loading ? "VERIFYING_CREDENTIALS..." : "SIGN IN →"}
          </button>
        </form>

        <div style={dividerStyle}><span>OR AUTHORIZE VIA</span></div>

        <button onClick={() => nextAuthSignIn("google", { callbackUrl: "/" })} style={secondaryBtn}>
          <img src="https://authjs.dev/img/providers/google.svg" width="18" alt="G" />
          Continue with Google
        </button>

        <Link href="/register" style={{ textDecoration: "none" }}>
          <button style={{ ...secondaryBtn, marginTop: "12px", borderColor: "#50fa7b", color: "#50fa7b" }}>
            [ NEW_USER_REGISTRATION ]
          </button>
        </Link>

      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
      `}</style>
    </main>
  );
}

// --- STYLES ---
const inputStyle: React.CSSProperties = {
  width: "100%",
  backgroundColor: "rgba(255,255,255,0.03)",
  border: "1px solid #2a2e3f",
  borderRadius: "12px",
  padding: "14px",
  color: "#fff",
  outline: "none",
  fontFamily: "monospace",
  fontSize: "14px",
  boxSizing: "border-box",
};

const primaryBtn: React.CSSProperties = {
  width: "100%", backgroundColor: "#00d2ff", color: "#000",
  border: "none", borderRadius: "12px", padding: "16px",
  fontWeight: 900, cursor: "pointer",
  boxShadow: "0 0 15px rgba(0, 210, 255, 0.2)",
  fontFamily: "monospace", transition: "0.2s",
};

const secondaryBtn: React.CSSProperties = {
  width: "100%", backgroundColor: "transparent",
  border: "1px solid #2a2e3f", color: "#fff",
  borderRadius: "12px", padding: "14px",
  display: "flex", alignItems: "center", justifyContent: "center",
  gap: "10px", cursor: "pointer", transition: "0.2s",
  fontFamily: "monospace", fontSize: "12px",
};

const dividerStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "10px",
  color: "#444", fontSize: "10px", margin: "24px 0",
  fontFamily: "monospace",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ color: "#00d2ff", padding: "50px", fontFamily: "monospace" }}>BOOTING_SYSTEM_AUTH...</div>}>
      <LoginContent />
    </Suspense>
  );
}