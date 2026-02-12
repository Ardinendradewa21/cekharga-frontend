import bcrypt from "bcryptjs";
import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/server/auth/admin-policy";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const dbUser = await prisma.user.findUnique({
          where: {
            email: parsed.data.email,
          },
        });

        if (!dbUser?.password) return null;

        const normalizedHash = dbUser.password.startsWith("$2y$")
          ? `$2b$${dbUser.password.slice(4)}`
          : dbUser.password;

        const isValidPassword = await bcrypt.compare(parsed.data.password, normalizedHash);
        if (!isValidPassword) return null;
        if (!isAdminEmail(dbUser.email)) return null;

        return {
          id: String(dbUser.id),
          name: dbUser.name,
          email: dbUser.email,
          role: "admin",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "admin";
      }

      // Backward compatibility for old cookies that don't carry `role` yet.
      if (!token.role) {
        token.role = isAdminEmail(typeof token.email === "string" ? token.email : null) ? "admin" : "guest";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.role = token.role === "admin" || token.role === "guest" ? token.role : "guest";
      }
      return session;
    },
  },
};
