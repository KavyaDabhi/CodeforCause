"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { useSession, signIn } from "next-auth/react";

const cyberStyles = `
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #00d2ff33; border-radius: 10px; }
  input, select, textarea, button { cursor: pointer !important; }
  input[type="text"], input[type="email"], input[type="tel"], textarea { cursor: text !important; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp 0.4s ease forwards; }
`;

export default function EventRegistrationPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const inputClass = "bg-black/60 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-[#00d2ff] w-full transition-all text-white font-mono placeholder:text-gray-600";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const [formSchema, setFormSchema] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});

  // 1. Fetch Event & Form Data
  useEffect(() => {
    const fetchMissionData = async () => {
      if (!eventId) return;
      try {
        const eventDoc = await getDoc(doc(db, "events", eventId));
        if (eventDoc.exists()) setEventData(eventDoc.data());

        const q = query(collection(db, "forms"), where("eventId", "==", eventId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const formData = querySnapshot.docs[0].data();
          setFormSchema({ id: querySnapshot.docs[0].id, ...formData });
          const initialAnswers: Record<string, any> = {};
          formData.questions?.forEach((q: any) => {
            initialAnswers[q.id] = q.type === "CHECKBOX" ? [] : "";
          });
          setCustomAnswers(initialAnswers);
        }
      } catch (err) {
        console.error("Failed to fetch mission", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMissionData();
  }, [eventId]);

  // 2. Pre-flight: already registered?
  useEffect(() => {
    const checkExistingRegistration = async () => {
      if (status === "loading") return;
      if (!session?.user?.email) { setCheckingStatus(false); return; }
      try {
        const q = query(
          collection(db, "registrations"),
          where("eventId", "==", eventId),
          where("userEmail", "==", session.user.email.toLowerCase())
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) setIsAlreadyRegistered(true);
      } catch (err) {
        console.error("Failed to verify status:", err);
      } finally {
        setCheckingStatus(false);
      }
    };
    checkExistingRegistration();
  }, [eventId, session, status]);

  const handleCustomAnswer = (questionId: string, value: any, type: string) => {
    if (type === "CHECKBOX") {
      setCustomAnswers(prev => {
        const current = prev[questionId] as string[];
        if (current.includes(value)) return { ...prev, [questionId]: current.filter(v => v !== value) };
        return { ...prev, [questionId]: [...current, value] };
      });
    } else {
      setCustomAnswers(prev => ({ ...prev, [questionId]: value }));
    }
  };

  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let extractedName = "";
      if (formSchema?.questions) {
        const nameQuestion = formSchema.questions.find((q: any) => {
          const label = q.label.toLowerCase().replace(/[\s_\-]/g, "");
          return ["name", "fullname", "yourname", "participant", "studentname"].some(kw => label.includes(kw));
        });
        if (nameQuestion && customAnswers[nameQuestion.id]) {
          extractedName = customAnswers[nameQuestion.id].trim();
        }
      }
      const payload = {
        eventId,
        eventTitle: eventData.title,
        formId: formSchema?.id || "N/A",
        userEmail: session?.user?.email?.toLowerCase() || "guest@cfc.com",
        userName: extractedName || session?.user?.name || "Participant",
        responses: customAnswers,
        attendanceStatus: "REGISTERED",
        certificateIssued: false,
        submittedAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
      };
      await addDoc(collection(db, "registrations"), payload);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Transmission Failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading screen ──
  if (loading || checkingStatus || status === "loading") {
    return (
      <div className="min-h-screen bg-[#05060a] flex items-center justify-center text-[#00d2ff] font-mono animate-pulse tracking-widest uppercase text-xs">
        Decrypting_Mission_Data...
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="min-h-screen bg-[#05060a] flex items-center justify-center text-[#ff5555] font-mono tracking-widest uppercase text-xs">
        Mission_Not_Found
      </div>
    );
  }

  // ── NOT SIGNED IN — gate screen ──
  if (status === "unauthenticated" || !session) {
    return (
      <div className="min-h-screen bg-[#05060a] flex items-center justify-center p-4 font-mono">
        <style>{cyberStyles}</style>

        {/* Subtle grid bg */}
        <div className="absolute inset-0 pointer-events-none opacity-10"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="bg-[#0B111A] border border-[#00d2ff]/30 rounded-3xl p-8 md:p-12 max-w-md w-full text-center shadow-[0_0_60px_rgba(0,210,255,0.08)] relative fade-up">

          {/* Lock icon */}
          <div className="w-20 h-20 bg-[#00d2ff]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#00d2ff]/20">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          {/* Terminal tag */}
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] animate-pulse" />
            <span className="text-[9px] text-[#00d2ff] font-bold tracking-[0.25em] uppercase">Auth_Required</span>
          </div>

          <h2 className="text-white font-black text-2xl uppercase tracking-tight mb-2">
            Sign In to Register
          </h2>

          {/* Event name pill */}
          <div className="inline-block bg-white/5 border border-white/10 rounded-xl px-4 py-2 mb-4">
            <p className="text-[#00d2ff] text-[10px] font-bold uppercase tracking-widest truncate max-w-[260px]">
              {eventData.title}
            </p>
          </div>

          <p className="text-gray-500 text-xs leading-relaxed mb-8">
            You need a CFC account to register for this event. Sign in with your college Google account to continue.
          </p>

          {/* Sign in button */}
          <button
          // Change it to this if using hash routing:
onClick={() => signIn("google", { callbackUrl: `/#/events/${eventId}` })}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-black p-4 rounded-2xl text-xs uppercase tracking-[0.15em] transition-all hover:bg-[#00d2ff] hover:text-black active:scale-95 mb-4 shadow-lg"
          >
            {/* Google icon */}
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Back link */}
          <Link
            href={`/`}
            className="text-gray-600 hover:text-gray-400 text-[10px] uppercase tracking-widest font-bold transition-colors"
          >
            ← Back to Home
          </Link>

        </div>
      </div>
    );
  }

  // ── Already registered ──
  if (isAlreadyRegistered) {
    return (
      <div className="min-h-screen bg-[#05060a] flex items-center justify-center p-4 font-mono">
        <div className="bg-[#0B111A] border border-[#f1fa8c]/40 rounded-3xl p-10 max-w-md w-full text-center shadow-[0_0_50px_rgba(241,250,140,0.1)] fade-up">
          <div className="w-20 h-20 bg-[#f1fa8c]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#f1fa8c]/30">
            <span className="text-[#f1fa8c] text-3xl">!</span>
          </div>
          <h2 className="text-[#f1fa8c] font-black text-xl uppercase tracking-widest mb-2">Already Assigned</h2>
          <p className="text-gray-400 text-xs mb-8">Our records show you are already registered for {eventData.title}.</p>
          <Link href="/dashboard" className="block bg-[#f1fa8c] text-black font-black w-full p-4 rounded-xl text-xs uppercase tracking-widest hover:bg-white transition-all">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (success) {
    return (
      <div className="min-h-screen bg-[#05060a] flex items-center justify-center p-4 font-mono">
        <div className="bg-[#0B111A] border border-[#50fa7b]/40 rounded-3xl p-10 max-w-md w-full text-center shadow-[0_0_50px_rgba(80,250,123,0.1)] fade-up">
          <div className="w-20 h-20 bg-[#50fa7b]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#50fa7b]/30">
            <span className="text-[#50fa7b] text-3xl">✓</span>
          </div>
          <h2 className="text-[#50fa7b] font-black text-xl uppercase tracking-widest mb-2">Access Granted</h2>
          <p className="text-gray-400 text-xs mb-8">Your registration for {eventData.title} has been secured.</p>
          <Link href="/dashboard" className="block bg-[#50fa7b] text-black font-black w-full p-4 rounded-xl text-xs uppercase tracking-widest hover:bg-white transition-all">
            Return to Base
          </Link>
        </div>
      </div>
    );
  }

  // ── Main registration form ──
  return (
    <div className="min-h-screen bg-[#05060a] py-12 px-4 font-mono text-white selection:bg-[#00d2ff] selection:text-black">
      <style>{cyberStyles}</style>

      <div className="max-w-3xl mx-auto pt-10">

        {/* Signed-in user pill */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 bg-[#50fa7b]/10 border border-[#50fa7b]/20 px-4 py-2 rounded-full">
            {session.user?.image && (
              <img src={session.user.image} alt="" className="w-5 h-5 rounded-full border border-[#50fa7b]/40" referrerPolicy="no-referrer" />
            )}
            <span className="text-[10px] text-[#50fa7b] font-bold tracking-widest uppercase truncate max-w-[220px]">
              {session.user?.email}
            </span>
            <span className="text-[9px] text-[#50fa7b]/60 uppercase font-bold">✓ Verified</span>
          </div>
        </div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-[#00d2ff] animate-pulse" />
            <span className="text-[10px] text-[#00d2ff] font-bold tracking-[0.2em] uppercase">CFC_Registry_Terminal</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-3">{eventData.title}</h1>
          <p className="text-gray-500 text-xs uppercase tracking-widest">{eventData.date} | {eventData.venue}</p>
        </div>

        <form onSubmit={submitRegistration} className="bg-[#0B111A] border border-white/5 rounded-3xl p-6 md:p-10 shadow-2xl">

          {formSchema && formSchema.questions?.length > 0 ? (
            <div className="mb-10 p-6 border border-[#bd93f9]/20 bg-[#bd93f9]/5 rounded-2xl space-y-5">
              <h3 className="text-[10px] font-black text-[#bd93f9] uppercase tracking-widest mb-4 border-b border-[#bd93f9]/20 pb-3">Mission Questionnaire</h3>

              {formSchema.questions.map((q: any) => (
                <div key={q.id} className="mb-4">
                  <label className="block text-[10px] text-gray-300 uppercase font-bold tracking-wider mb-2">
                    {q.label} {q.required && <span className="text-[#ff5555]">*</span>}
                  </label>

                  {(q.type === "SHORT" || q.type === "EMAIL" || q.type === "PHONE" || q.type === "DATE") && (
                    <input type={q.type === "DATE" ? "date" : "text"} required={q.required} placeholder="Your answer..." className={`${inputClass} focus:border-[#bd93f9]`} value={customAnswers[q.id] || ""} onChange={e => handleCustomAnswer(q.id, e.target.value, q.type)} />
                  )}

                  {q.type === "PARAGRAPH" && (
                    <textarea required={q.required} rows={3} placeholder="Your answer..." className={`${inputClass} focus:border-[#bd93f9]`} value={customAnswers[q.id] || ""} onChange={e => handleCustomAnswer(q.id, e.target.value, q.type)} />
                  )}

                  {q.type === "DROPDOWN" && (
                    <select required={q.required} className={`${inputClass} focus:border-[#bd93f9]`} value={customAnswers[q.id] || ""} onChange={e => handleCustomAnswer(q.id, e.target.value, q.type)}>
                      <option value="">Select an option...</option>
                      {q.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}

                  {q.type === "MCQ" && (
                    <div className="space-y-2">
                      {q.options?.map((opt: string) => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer text-xs text-gray-400 hover:text-white">
                          <input type="radio" name={q.id} required={q.required} value={opt} checked={customAnswers[q.id] === opt} onChange={e => handleCustomAnswer(q.id, e.target.value, q.type)} className="accent-[#bd93f9]" />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === "CHECKBOX" && (
                    <div className="space-y-2">
                      {q.options?.map((opt: string) => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer text-xs text-gray-400 hover:text-white">
                          <input type="checkbox" value={opt} checked={customAnswers[q.id]?.includes(opt) || false} onChange={e => handleCustomAnswer(q.id, e.target.value, q.type)} className="accent-[#bd93f9]" />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-10">
              No additional mission data required. Proceed to confirm.
            </div>
          )}

          <div className="mt-6 pt-8 border-t border-white/10">
            <button type="submit" disabled={submitting} className="w-full bg-[#00d2ff] text-black font-black p-5 rounded-2xl uppercase tracking-[0.2em] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 text-sm shadow-[0_0_30px_rgba(0,210,255,0.2)]">
              {submitting ? "TRANSMITTING..." : "CONFIRM REGISTRATION →"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}