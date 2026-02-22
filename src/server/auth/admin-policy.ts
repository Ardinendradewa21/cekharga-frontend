function parseAdminEmails(): string[] {
  // Ambil daftar email admin dari env, lalu normalisasi agar perbandingan konsisten.
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const adminEmails = parseAdminEmails();

  // Default kompatibilitas lama:
  // jika ADMIN_EMAILS kosong, semua user login dianggap admin.
  if (adminEmails.length === 0) return true;
  return adminEmails.includes(normalized);
}
