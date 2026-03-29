// components/ParticipantBadge.tsx
// Drop this into any event card — it shows a live real-time
// participant count that updates instantly as people register.
//
// Usage:
//   <ParticipantBadge eventId={event.id} />

"use client";
import { useParticipantCount } from "@/hooks/useParticipantCount";

export default function ParticipantBadge({ eventId }: { eventId: string }) {
  const count = useParticipantCount(eventId);

  return (
    <span className="inline-flex items-center gap-1.5 bg-[#00d2ff]/10 border border-[#00d2ff]/20 text-[#00d2ff] px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
      {/* Live pulse dot */}
      <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] animate-pulse shrink-0" />
      {count} {count === 1 ? "Operative" : "Operatives"} Registered
    </span>
  );
}