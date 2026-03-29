import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export function useParticipantCount(eventId: string) {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (!eventId) return;

    // Target the registrations collection for this specific mission
    const q = query(
      collection(db, "registrations"),
      where("eventId", "==", eventId)
    );

    // Listen for real-time updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // If you want to count total humans (including team members), you'd sum up doc.data().teamSize
      // But counting the total number of registrations (squads/solos) is usually best:
      setCount(snapshot.size); 
    });

    // Cleanup the listener when unmounted
    return () => unsubscribe();
  }, [eventId]);

  return count;
}