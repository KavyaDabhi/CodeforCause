import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export interface EventNode {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;       // The Calendar Date
  startTime: string;  // e.g., "10:15 AM"
  venue: string;      // e.g., "Seminar Hall, CSPIT"
  regLink: string;    // Google Form Link
  posterUrl: string;  // Cloudinary Link
  status: string;
}

export const subscribeToEvents = (callback: (events: EventNode[]) => void) => {
  const q = query(collection(db, "events"), orderBy("timestamp", "desc"));
  
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EventNode[];
    callback(events);
  });
};