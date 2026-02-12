"use client";

import { signOut } from "next-auth/react";

export function AdminLogoutButton() {
  return (
    <button
      type="button"
      className="text-sm text-red-600 hover:underline"
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
    >
      Logout
    </button>
  );
}

