import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // In dev, allow linking a Google account to a pre-seeded user
      // to avoid OAuthAccountNotLinked loops.
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      try {
        const memberships = await prisma.membership.count({ where: { userId: user.id } });
        if (memberships === 0) {
          const base = user.name?.split(" ")[0] || user.email?.split("@")[0] || "Personal";
          const org = await prisma.org.create({ data: { name: `${base}'s Workspace` } });
          await prisma.membership.create({ data: { userId: user.id, orgId: org.id, role: "OWNER" as any } });
        }
      } catch (e) {
        console.error("signIn provisioning error", e);
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.uid as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
};

export const { handlers: authHandlers } = NextAuth(authOptions);
