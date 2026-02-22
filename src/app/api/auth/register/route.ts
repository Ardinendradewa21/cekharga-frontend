import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { jsonError, jsonSuccess } from "@/server/api/response";
import { isAdminEmail } from "@/server/auth/admin-policy";

export const runtime = "nodejs";

// Validasi payload registrasi agar data yang masuk ke DB selalu rapi.
const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(255, "Nama terlalu panjang."),
    email: z.string().trim().email("Email tidak valid.").max(255, "Email terlalu panjang."),
    password: z.string().min(8, "Password minimal 8 karakter.").max(72, "Password maksimal 72 karakter."),
    passwordConfirmation: z.string().min(1, "Konfirmasi password wajib diisi."),
  })
  .refine((payload) => payload.password === payload.passwordConfirmation, {
    message: "Konfirmasi password tidak sama.",
    path: ["passwordConfirmation"],
  });

export async function POST(request: Request) {
  try {
    // 1) Ambil dan validasi body request.
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Data registrasi tidak valid.", 400);
    }

    const normalizedEmail = parsed.data.email.toLowerCase();
    // 2) Batasi registrasi hanya untuk email yang masuk allowlist ADMIN_EMAILS.
    if (!isAdminEmail(normalizedEmail)) {
      return jsonError("Email ini belum diizinkan sebagai admin. Tambahkan dulu di ADMIN_EMAILS.", 403);
    }

    // 3) Cegah email ganda.
    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existingUser) {
      return jsonError("Email sudah terdaftar. Silakan login.", 409);
    }

    // 4) Simpan password dalam bentuk hash (bukan plain text).
    const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
    const now = new Date();

    // 5) Buat user baru sesuai struktur tabel `users`.
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: normalizedEmail,
        email_verified_at: now,
        password: hashedPassword,
        remember_token: null,
        created_at: now,
        updated_at: now,
      },
    });

    return jsonSuccess(
      {
        email: normalizedEmail,
      },
      "Registrasi admin berhasil. Anda bisa langsung masuk.",
    );
  } catch (error) {
    // Handle race condition unik email dari database.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("Email sudah terdaftar. Silakan login.", 409);
    }
    return jsonError("Terjadi error saat registrasi admin.", 500);
  }
}
