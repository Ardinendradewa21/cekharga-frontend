export const SITE_NAME = "CekHarga";
export const SITE_DESCRIPTION =
  "Bandingkan harga HP baru dan bekas dari marketplace, lengkap dengan spesifikasi teknis dan review video.";

export function getSiteUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  return "http://localhost:3000";
}

export function absoluteUrl(path: string) {
  const base = getSiteUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
