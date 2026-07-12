"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase"; // Adjust this path to your actual Firebase config
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Strict .edu.in domain validation
    if (!email.toLowerCase().endsWith(".edu.in")) {
      setError("ACCESS_DENIED: Only institutional .edu.in domains are permitted.");
      setIsLoading(false);
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // Route to dashboard or verification page after successful creation
      router.push("/dashboard"); 
    } catch (err: any) {
      setError(`ERR_SYS: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#50fa7b] font-mono flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md border border-[#50fa7b]/30 p-8 rounded-sm bg-black shadow-[0_0_15px_rgba(80,250,123,0.1)]"
      >
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-widest mb-2">
            [ INIT_USER_REGISTRATION ]
          </h1>
          <p className="text-[#6272a4] text-sm">
            $ await strict_auth_protocol --domain=".edu.in"
          </p>
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm">
              &gt; INPUT_EMAIL_ADDRESS:
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-transparent border border-[#50fa7b]/50 p-2 text-[#f8f8f2] focus:outline-none focus:border-[#50fa7b] focus:ring-1 focus:ring-[#50fa7b] transition-all"
              placeholder="user@domain.edu.in"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm">
              &gt; INPUT_SECURE_KEY:
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-transparent border border-[#50fa7b]/50 p-2 text-[#f8f8f2] focus:outline-none focus:border-[#50fa7b] focus:ring-1 focus:ring-[#50fa7b] transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-[#ff5555] text-sm border border-[#ff5555]/50 p-2 bg-[#ff5555]/10"
            >
              {error}
            </motion.div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="mt-4 border border-[#50fa7b] text-[#50fa7b] py-2 px-4 hover:bg-[#50fa7b]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "[ PROCESSING... ]" : "[ EXECUTE_REGISTRATION ]"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[#6272a4]">
          SYSTEM_PROMPT: Already have an authorized instance? <br />
          <Link href="/login" className="text-[#8be9fd] hover:underline mt-2 inline-block">
            &gt; /execute_login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}