export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── All imports and inits INSIDE the handler ──
  const admin = (await import("firebase-admin")).default;
  const webpush = (await import("web-push")).default;

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }

  const db = admin.firestore();

  webpush.setVapidDetails(
    "mailto:cfc@charusat.ac.in",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const eventsSnap = await db.collection("events").where("date", "==", tomorrowStr).get();
    const tomorrowEvents = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    if (tomorrowEvents.length === 0) {
      return NextResponse.json({ message: "No events tomorrow", sent: 0 });
    }

    const subsSnap = await db.collection("pushSubscriptions").get();
    const allSubs = subsSnap.docs.map(d => d.data());

    let sent = 0;
    let failed = 0;

    for (const event of tomorrowEvents) {
      const regsSnap = await db.collection("registrations").where("eventId", "==", event.id).get();

      const registeredEmails = new Set(
        regsSnap.docs.map(d => d.data().userEmail?.toLowerCase()).filter(Boolean)
      );

      const targetSubs = allSubs.filter(sub =>
        registeredEmails.has(sub.email?.toLowerCase())
      );

      for (const subDoc of targetSubs) {
        try {
          await webpush.sendNotification(
            subDoc.subscription,
            JSON.stringify({
              title: `⚡ CFC Event Tomorrow: ${event.title}`,
              body: `${event.title} is happening tomorrow at ${event.startTime || "see details"} · ${event.venue}`,
              tag: `cfc-event-${event.id}`,
              url: `https://cfc-charusat.vercel.app/dashboard`,
            })
          );
          sent++;
        } catch (err: any) {
          console.error(`Push failed for ${subDoc.email}:`, err.message);
          failed++;
          if (err.statusCode === 410) {
            await db.collection("pushSubscriptions").doc(subDoc.email).delete();
          }
        }
      }
    }

    return NextResponse.json({
      message: "Notifications sent",
      tomorrowEvents: tomorrowEvents.map(e => e.title),
      sent,
      failed,
    });

  } catch (err: any) {
    console.error("Notify route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}