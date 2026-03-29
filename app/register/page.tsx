"use client";
import { useState, useEffect, Suspense } from "react";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore"; // 🎯 Added collection, query, where, getDocs
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  // 🎯 1. REAL-TIME PASSWORD VALIDATION
  const criteria = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*]/.test(password),
  };
  const isPasswordValid = Object.values(criteria).every(Boolean);
  const hasStartedTyping = password.length > 0;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return; // Prevent submission of weak passwords

    setLoading(true);

    const isCharusat = email.toLowerCase().endsWith("@charusat.ac.in") || email.toLowerCase().endsWith("@charusat.edu.in");
    
    if (!isCharusat) {
      alert("CRITICAL_ERROR: Access restricted to @charusat domains.");
      setLoading(false);
      return;
    }

    try {
      // 🎯 UNIQUE IDENTITY CHECK: Ensure Full Name isn't already in the registry
      const q = query(collection(db, "users"), where("displayName", "==", name));
      const snap = await getDocs(q);
      if (!snap.empty) {
        alert("IDENTITY_EXISTS: This name is already registered. Use a different name.");
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      try {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          displayName: name,
          email: email.toLowerCase(), // 🎯 Store in lowercase
          role: "student",
          initializedAt: new Date().toISOString(),
        });
      } catch (dbError) {
        console.error("Firestore Init Error:", dbError);
      }

      alert("IDENTITY_INITIALIZED.");
      window.location.href = "/login"; 
      
    } catch (error: any) {
      alert("INITIALIZATION_FAILED: " + error.message);
      setLoading(false);
    }
  };

  return (
    <main style={containerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={badgeStyle}>INITIALIZE_NEW_NODE</div>
          <h1 style={titleStyle}>System Registration</h1>
        </div>

        <form onSubmit={handleRegister} style={formStyle}>
          <div style={inputGroup}>
            <label style={labelStyle}>FULL_NAME</label>
            <input 
              type="text" 
              placeholder="Enter full name..." 
              required 
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle} 
            />
          </div>

          <div style={inputGroup}>
            <label style={labelStyle}>EMAIL_IDENTITY</label>
            <input 
              type="email" 
              placeholder="university_id@charusat..." 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle} 
            />
          </div>

          <div style={inputGroup}>
            <label style={labelStyle}>ACCESS_KEY</label>
            <input 
              type="password" 
              placeholder="Set secure password..." 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                ...inputStyle, 
                borderColor: (hasStartedTyping && !isPasswordValid) ? '#ff5555' : '#2a2e3f'
              }} 
            />
          </div>

          {/* 🚨 THE CYBER-ALERT WARNING BLOCK */}
          {hasStartedTyping && !isPasswordValid && (
            <div style={warningBlockStyle}>
              <p style={{ color: '#ff5555', fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', fontFamily: 'monospace' }}>
                [!] SECURITY_PROTOCOL_VIOLATION:
              </p>
              <div style={criteriaGridStyle}>
                <span style={{ color: criteria.length ? '#50fa7b' : '#ffaaaa', opacity: criteria.length ? 0.4 : 1 }}>{criteria.length ? '✔' : '•'} 8+ Chars</span>
                <span style={{ color: criteria.upper ? '#50fa7b' : '#ffaaaa', opacity: criteria.upper ? 0.4 : 1 }}>{criteria.upper ? '✔' : '•'} Uppercase</span>
                <span style={{ color: criteria.number ? '#50fa7b' : '#ffaaaa', opacity: criteria.number ? 0.4 : 1 }}>{criteria.number ? '✔' : '•'} Number</span>
                <span style={{ color: criteria.special ? '#50fa7b' : '#ffaaaa', opacity: criteria.special ? 0.4 : 1 }}>{criteria.special ? '✔' : '•'} Special (!@#)</span>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || (hasStartedTyping && !isPasswordValid)} 
            style={{
              ...btnStyle,
              backgroundColor: (hasStartedTyping && !isPasswordValid) ? '#1a1d2b' : '#50fa7b',
              color: (hasStartedTyping && !isPasswordValid) ? '#444' : '#000',
              cursor: (hasStartedTyping && !isPasswordValid) ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? "COMMITTING..." : "INITIALIZE_PROFILE →"}
          </button>
        </form>

        <div style={footerStyle}>
          <Link href="/login" style={linkStyle}>
            &lt; RETURN_TO_LOGIN
          </Link>
        </div>
      </div>
    </main>
  );
}

// --- STYLES ---
const containerStyle = { minHeight: 'calc(100vh - 44px)', backgroundColor: '#050A14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' };
const cardStyle = { width: '100%', maxWidth: '450px', backgroundColor: '#0B111A', border: '1px solid rgba(80, 250, 123, 0.2)', borderRadius: '24px', padding: '40px 32px' };
const headerStyle = { textAlign: 'center' as const, marginBottom: '32px' };
const badgeStyle = { display: 'inline-block', padding: '4px 12px', backgroundColor: 'rgba(80, 250, 123, 0.1)', color: '#50fa7b', fontSize: '10px', fontWeight: 'bold', borderRadius: '4px', marginBottom: '12px', border: '1px solid rgba(80, 250, 123, 0.3)' };
const titleStyle = { color: '#fff', fontSize: '24px', fontWeight: 900, marginBottom: '8px' };
const formStyle = { display: 'flex', flexDirection: 'column' as const, gap: '20px' };
const inputGroup = { display: 'flex', flexDirection: 'column' as const, gap: '8px' };
const labelStyle = { color: '#fff', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' };
const inputStyle = { width: '100%', backgroundColor: '#000', border: '1px solid #2a2e3f', borderRadius: '12px', padding: '14px', color: '#fff', outline: 'none', fontFamily: 'monospace', transition: 'all 0.3s' };
const btnStyle = { width: '100%', backgroundColor: '#50fa7b', color: '#000', border: 'none', borderRadius: '12px', padding: '16px', fontWeight: 900, cursor: 'pointer', marginTop: '10px', transition: '0.3s' };
const footerStyle = { marginTop: '24px', textAlign: 'center' as const };
const linkStyle = { color: '#666', fontSize: '12px', textDecoration: 'none', fontWeight: 'bold' };

const warningBlockStyle = {
  backgroundColor: 'rgba(255, 85, 85, 0.1)',
  borderLeft: '4px solid #ff5555',
  padding: '12px',
  borderRadius: '8px',
  marginTop: '-10px'
};

const criteriaGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '6px',
  fontSize: '9px',
  fontFamily: 'monospace'
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{color: '#50fa7b'}}>LOADING...</div>}>
      <RegisterContent />
    </Suspense>
  );
}