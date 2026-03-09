const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(value?: number | null): string {
  if (!value || value <= 0) return "-";
  return rupiahFormatter.format(value);
}
