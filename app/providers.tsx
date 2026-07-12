// app/providers.tsx
"use client";
import { SessionProvider } from "next-auth/react";
import { GothamProvider } from "@/app/context/GothamContext"; // 🚀 Import the provider

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* 🚀 Wrap the app in the GothamProvider */}
      <GothamProvider>
        {children}
      </GothamProvider>
    </SessionProvider>
  );
}