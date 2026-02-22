import { isAdminEmail } from "./admin-policy";
import { getSafeServerSession } from "./session";

export async function requireAdminSession() {
  const session = await getSafeServerSession();
  const isAdmin = isAdminEmail(session?.user?.email);

  if (!session?.user || !isAdmin) {
    return null;
  }

  return session;
}
