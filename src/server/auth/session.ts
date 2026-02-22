import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";

export async function getSafeServerSession() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("decryption operation failed")) {
      return null;
    }
    throw error;
  }
}
