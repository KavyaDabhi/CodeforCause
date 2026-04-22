// hooks/useParticipantCount.ts
// Returns a live real-time count of registrations for a given eventId.
// Uses onSnapshot so the number updates instantly when someone registers.

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export function useParticipantCount(eventId: string): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!eventId) return;
    const q = query(collection(db, "registrations"), where("eventId", "==", eventId));
    const unsub = onSnapshot(q, snapshot => setCount(snapshot.size));
    return () => unsub();
  }, [eventId]);

  return count;
}