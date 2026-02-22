import { redirect } from "next/navigation";

import { requireAdminSession } from "@/server/auth/admin";

import { RegisterForm } from "./RegisterForm";

export default async function AdminRegisterPage() {
  const session = await requireAdminSession();
  if (session?.user) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md">
      <RegisterForm />
    </div>
  );
}
