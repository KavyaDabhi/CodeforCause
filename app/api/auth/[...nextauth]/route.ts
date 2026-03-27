import NextAuth, { DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { FirestoreAdapter } from "@auth/firebase-adapter";
import { db } from "@/lib/firebase";

// --- TYPESCRIPT OVERRIDE ---
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

const handler = NextAuth({
  // Link to your Firebase Firestore
 // adapter: FirestoreAdapter(db as any), 

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Allows linking Google to an existing email/password account if emails match
      allowDangerousEmailAccountLinking: true, 
    }),

  CredentialsProvider({
  name: "Credentials",
  credentials: {
    email: { label: "Email", type: "text" },
    password: { label: "Password", type: "password" }
  },
  async authorize(credentials) {
    if (credentials?.email) {
      return { 
        id: credentials.email, 
        email: credentials.email, 
        name: "Root Admin",
        // 🎯 ADD THIS: A default avatar for manual logins
        image: "https://ui-avatars.com/api/?name=Root+Admin&background=00d2ff&color=fff" 
      };
    }
    return null;
  }
}),
  ],


  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async signIn({ user, account }) {
  if (account?.provider === "google") {
    const email = user.email?.toLowerCase().trim();
    console.log("LOGIN_ATTEMPT_FROM:", email); // This will show in Vercel Logs

    if (email && email.endsWith("@charusat.edu.in")) {
      return true;
    }
    return false; // Rejects anyone else
  }
  return true;
},
    
  async jwt({ token, user }) {
    if (user) {
      token.email = user.email;
      token.id = user.id;
      token.picture = user.image; // 🎯 Make sure the picture is captured
    }
    return token;
  },

  async session({ session, token }) {
    if (session.user) {
      session.user.email = token.email as string;
      session.user.id = token.id as string;
      session.user.image = token.picture as string; // 🎯 Sync it to the session
    }
    return session;
  },

    async redirect({ url, baseUrl }) {
      // 🎯 FORCE the redirect to the main domain to break the loop
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allow redirects to the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  // 🎯 Add this to debug in Vercel Logs
  debug: true,
});



export { handler as GET, handler as POST };