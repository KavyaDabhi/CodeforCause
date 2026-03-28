import NextAuth, { DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
// 🎯 Adapter and DB imports removed to prevent the loop crash

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

const handler = NextAuth({
  // 🎯 DB ADAPTER REMOVED - This stops the 'error=Callback' loop
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
  session: {
    strategy: "jwt", // Fast, stateless, and reliable on Vercel
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        return !!user.email?.endsWith("@charusat.edu.in"); 
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
        session.user.id = token.id as string;
        session.user.name = token.name as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
});

export { handler as GET, handler as POST };