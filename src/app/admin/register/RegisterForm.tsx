"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RegisterApiResponse = {
  success?: boolean;
  message?: string;
};

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const callbackUrl = searchParams.get("callbackUrl") || "/admin";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          passwordConfirmation,
        }),
      });

      const payload = (await response.json()) as RegisterApiResponse;
      if (!response.ok || !payload.success) {
        setErrorMessage(payload.message ?? "Registrasi gagal. Coba lagi.");
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (!signInResult || signInResult.error) {
        router.push("/admin/login?registered=1");
        router.refresh();
        return;
      }

      router.push(signInResult.url || callbackUrl);
      router.refresh();
    } catch {
      setErrorMessage("Terjadi kendala jaringan. Coba beberapa saat lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Registrasi Admin</h1>
        <p className="text-sm text-slate-500">
          Buat akun admin baru. Email harus masuk daftar <code>ADMIN_EMAILS</code>.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nama</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="passwordConfirmation">Konfirmasi Password</Label>
        <Input
          id="passwordConfirmation"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          required
        />
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
      ) : null}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Membuat akun..." : "Daftar Admin"}
      </Button>

      <p className="text-center text-sm text-slate-500">
        Sudah punya akun?{" "}
        <Link href="/admin/login" className="font-medium text-blue-600 hover:underline">
          Login di sini
        </Link>
      </p>
    </form>
  );
}
