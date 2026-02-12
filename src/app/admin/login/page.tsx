import { redirect } from "next/navigation";
import { requireAdminSession } from "@/server/auth/admin";

import { LoginForm } from "./LoginForm";

export default async function AdminLoginPage() {
  const session = await requireAdminSession();
  if (session?.user) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md">
      <LoginForm />
    </div>
  );
}
