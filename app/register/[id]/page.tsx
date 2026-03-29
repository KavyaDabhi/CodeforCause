"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useSession } from "next-auth/react";

const cyberStyles = `
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #00d2ff33; border-radius: 10px; }
  input, select, textarea, button { cursor: pointer !important; }
  input[type="text"], input[type="email"], input[type="tel"], textarea { cursor: text !important; }
`;

export default function EventRegistrationPage() {
  const { data: session } = useSession();
  const params = useParams();
  const eventId = params.id as string;

  const inputClass = "bg-black/60 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-[#00d2ff] w-full transition-all text-white font-mono placeholder:text-gray-600";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const [formSchema, setFormSchema] = useState<any>(null);
  
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchMissionData = async () => {
      if (!eventId) return;
      try {
        const eventDoc = await getDoc(doc(db, "events", eventId));
        if (eventDoc.exists()) {
          setEventData(eventDoc.data());
        }

        import("firebase/firestore").then(async ({ query, where, getDocs }) => {
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
        });

      } catch (err) {
        console.error("Failed to fetch mission", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMissionData();
  }, [eventId]);

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
      // 1. 🚀 SMART EXTRACTION: Find the answer to the "Name" question
      let extractedName = "";
      
      if (formSchema?.questions) {
        // We look for a question label that includes "name", "participant", or "student"
        const nameField = formSchema.questions.find((q: any) => {
          const label = q.label.toLowerCase();
          return label.includes("name") || label.includes("participant") || label.includes("student");
        });

        if (nameField && customAnswers[nameField.id]) {
          extractedName = customAnswers[nameField.id].trim();
        }
      }

      // 2. Prepare the Payload
      const payload = {
        eventId,
        eventTitle: eventData.title,
        formId: formSchema?.id || "N/A",
        userEmail: session?.user?.email?.toLowerCase() || "guest@cfc.com",
        
        // 🚀 THE FIX: Use extracted name if found, otherwise fallback to session
        userName: extractedName || session?.user?.name || session?.user?.email?.split('@')[0] || "Participant",
        
        responses: customAnswers, 
        attendanceStatus: "REGISTERED",
        certificateIssued: false,
        submittedAt: new Date().toISOString(),
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, "registrations"), payload);
      setSuccess(true);
    } catch (err) {
      console.error("Registration failed:", err);
      alert("Transmission Failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#05060a] flex items-center justify-center text-[#00d2ff] font-mono animate-pulse tracking-widest uppercase">Decrypting_Mission_Data...</div>;
  if (!eventData) return <div className="min-h-screen bg-[#05060a] flex items-center justify-center text-[#ff5555] font-mono tracking-widest uppercase">Mission_Not_Found</div>;

  if (success) {
    return (
      <div className="min-h-screen bg-[#05060a] flex items-center justify-center p-4 font-mono">
        <div className="bg-[#0B111A] border border-[#50fa7b]/40 rounded-3xl p-10 max-w-md w-full text-center shadow-[0_0_50px_rgba(80,250,123,0.1)]">
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

  return (
    <div className="min-h-screen bg-[#05060a] py-12 px-4 font-mono text-white selection:bg-[#00d2ff] selection:text-black">
      <style>{cyberStyles}</style>
      
      <div className="max-w-3xl mx-auto pt-10">
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
                  
                  {(q.type === 'SHORT' || q.type === 'EMAIL' || q.type === 'PHONE' || q.type === 'DATE') && (
                    <input type={q.type === 'DATE' ? 'date' : 'text'} required={q.required} placeholder="Your answer..." className={`${inputClass} focus:border-[#bd93f9]`} value={customAnswers[q.id] || ""} onChange={(e) => handleCustomAnswer(q.id, e.target.value, q.type)} />
                  )}
                  
                  {q.type === 'PARAGRAPH' && (
                    <textarea required={q.required} rows={3} placeholder="Your answer..." className={`${inputClass} focus:border-[#bd93f9]`} value={customAnswers[q.id] || ""} onChange={(e) => handleCustomAnswer(q.id, e.target.value, q.type)} />
                  )}
                  
                  {q.type === 'DROPDOWN' && (
                    <select required={q.required} className={`${inputClass} focus:border-[#bd93f9]`} value={customAnswers[q.id] || ""} onChange={(e) => handleCustomAnswer(q.id, e.target.value, q.type)}>
                      <option value="">Select an option...</option>
                      {q.options?.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {q.type === 'MCQ' && (
                    <div className="space-y-2">
                      {q.options?.map((opt: string) => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer text-xs text-gray-400 hover:text-white">
                          <input type="radio" name={q.id} required={q.required} value={opt} checked={customAnswers[q.id] === opt} onChange={(e) => handleCustomAnswer(q.id, e.target.value, q.type)} className="accent-[#bd93f9]" />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === 'CHECKBOX' && (
                    <div className="space-y-2">
                      {q.options?.map((opt: string) => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer text-xs text-gray-400 hover:text-white">
                          <input type="checkbox" value={opt} checked={customAnswers[q.id]?.includes(opt) || false} onChange={(e) => handleCustomAnswer(q.id, e.target.value, q.type)} className="accent-[#bd93f9]" />
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