import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "guest";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "admin" | "guest";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "admin" | "guest";
  }
}
