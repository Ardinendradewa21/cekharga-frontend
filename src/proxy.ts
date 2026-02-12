import { withAuth } from "next-auth/middleware";

import { isAdminEmail } from "@/server/auth/admin-policy";

export default withAuth(
  () => {
    return undefined;
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        if (req.nextUrl.pathname.startsWith("/admin/login")) return true;
        if (!token) return false;

        if (token.role === "admin") return true;
        const email = typeof token.email === "string" ? token.email : null;
        return isAdminEmail(email);
      },
    },
    pages: {
      signIn: "/admin/login",
    },
  },
);

export const config = {
  matcher: ["/admin", "/admin/((?!login).*)"],
};
