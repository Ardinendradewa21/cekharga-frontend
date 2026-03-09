"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type SyncResult = {
  success: boolean;
  message: string;
  data?: { synced: number; failed: number; total: number };
};

export function SyncAllPricesButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  async function handleSync() {
    if (isLoading) return;
    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/sync-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 100 }),
      });
      const json = (await res.json()) as SyncResult;
      setResult(json);
    } catch {
      setResult({ success: false, message: "Gagal menghubungi server." });
    } finally {
      setIsLoading(false);
    }
  }

  const hasFailed = result?.data && result.data.failed > 0;

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => void handleSync()}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <RefreshCw className="h-4 w-4" />
        }
        {isLoading ? "Sinkronisasi..." : "Sync Semua Harga"}
      </Button>

      {result && (
        <div className="space-y-1">
          <p className={`text-xs font-medium ${result.success ? "text-emerald-700" : "text-red-600"}`}>
            {result.message}
            {result.data && (
              <span className="ml-1 text-slate-500">
                ({result.data.synced} berhasil · {result.data.failed} gagal)
              </span>
            )}
          </p>
          {hasFailed && (
            <div className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Tokopedia &amp; Shopee menggunakan proteksi anti-bot sehingga harga sulit diambil otomatis.
                Solusi: input harga manual di setiap varian produk, atau gunakan URL affiliate yang valid.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
