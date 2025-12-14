import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db as prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

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
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  events: {
    async signIn({ user, account, isNewUser }) {
      try {
        const memberships = await prisma.membership.count({ where: { userId: user.id } });
        let isFirstMembership = false;

        if (memberships === 0) {
          isFirstMembership = true;
          const base = user.name?.split(" ")[0] || user.email?.split("@")[0] || "Personal";
          const org = await prisma.org.create({ data: { name: `${base}'s Workspace` } });
          await prisma.membership.create({ data: { userId: user.id, orgId: org.id, role: "OWNER" as any } });
        }

        // Create UserPreferences if they don't exist
        const existingPreferences = await prisma.userPreferences.findUnique({
          where: { userId: user.id },
        });

        if (!existingPreferences) {
          // Check if user has any existing data (journal, P&L, positions, etc.)
          // If they do, mark onboarding as completed since they're an existing user
          const [journalCount, dailyPnlCount, positionCount] = await Promise.all([
            prisma.journalEntry.count({ where: { userId: user.id } }),
            prisma.dailyPnl.count({
              where: {
                org: {
                  memberships: {
                    some: { userId: user.id }
                  }
                }
              }
            }),
            prisma.positionSnapshot.count({
              where: {
                account: {
                  connection: {
                    userId: user.id
                  }
                }
              }
            })
          ]);

          const hasExistingData = journalCount > 0 || dailyPnlCount > 0 || positionCount > 0;

          await prisma.userPreferences.create({
            data: {
              userId: user.id,
              onboardingCompleted: hasExistingData, // Existing users skip onboarding, new users see it
            },
          });
        }

        // Log successful login (audit logging)
        const membership = await prisma.membership.findFirst({
          where: { userId: user.id }
        });

        if (membership) {
          await logAudit({
            orgId: membership.orgId,
            userId: user.id,
            action: "LOGIN",
            entity: "Session",
            entityId: user.id,
            after: {
              method: account?.provider || "credentials",
              isNewUser: isNewUser || isFirstMembership,
              timestamp: new Date().toISOString()
            }
          });
        }
      } catch (e) {
        console.error("signIn provisioning error", e);
      }
    },

    async signOut({ session, token }) {
      try {
        // Log logout event
        const userId = (token?.uid || (session?.user as any)?.id) as string;

        if (userId) {
          const membership = await prisma.membership.findFirst({
            where: { userId }
          });

          if (membership) {
            await logAudit({
              orgId: membership.orgId,
              userId,
              action: "LOGOUT",
              entity: "Session",
              entityId: userId,
              after: {
                timestamp: new Date().toISOString()
              }
            });
          }
        }
      } catch (e) {
        console.error("signOut logging error", e);
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
