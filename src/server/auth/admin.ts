import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";
import { isAdminEmail } from "./admin-policy";

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  const isAdmin = isAdminEmail(session?.user?.email);

  if (!session?.user || !isAdmin) {
    return null;
  }

  return session;
}
