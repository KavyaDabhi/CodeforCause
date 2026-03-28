import NextAuth, { DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { FirestoreAdapter } from "@auth/firebase-adapter";
import { db } from "@/lib/firebase";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

const handler = NextAuth({
  // 🎯 ENSURE: db is correctly imported from your lib/firebase
  adapter: FirestoreAdapter(db as any), 
  
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
            name: credentials.email.split('@')[0] 
          };
        }
        return null;
      }
    })
  ],

  // 🎯 CRITICAL: This must match your callback logic
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        // Only allow Charusat domain
        const isCharusat = !!user.email?.endsWith("@charusat.edu.in");
        if (!isCharusat) console.log("REJECTED_NON_CHARUSAT:", user.email);
        return isCharusat;
      }
      return true;
    },

    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // 🎯 LOOP PREVENTER: Force absolute URLs for Vercel
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  // 🎯 SECURITY: Ensure this is set in Vercel env
  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/login",
    error: "/login", // Redirect errors back to login instead of default error page
  },

  debug: process.env.NODE_ENV === "development", 
});

export { handler as GET, handler as POST };