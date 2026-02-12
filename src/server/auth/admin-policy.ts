function parseAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const adminEmails = parseAdminEmails();

  // Backward-compatible default: if allowlist is empty, all authenticated users are treated as admin.
  if (adminEmails.length === 0) return true;
  return adminEmails.includes(normalized);
}

