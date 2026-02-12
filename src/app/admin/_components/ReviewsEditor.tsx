"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RawReview = {
  reviewer_name?: string | null;
  platform?: string | null;
  video_url?: string | null;
  highlight_quote?: string | null;
};

type ReviewRow = {
  row_id: string;
  reviewer_name: string;
  platform: "youtube" | "tiktok";
  video_url: string;
  highlight_quote: string;
};

type ReviewsEditorProps = {
  name: string;
  initialReviews?: RawReview[];
};

function createEmptyReview(): ReviewRow {
  return {
    row_id: crypto.randomUUID(),
    reviewer_name: "",
    platform: "youtube",
    video_url: "",
    highlight_quote: "",
  };
}

function normalizeReview(review: RawReview): ReviewRow {
  return {
    row_id: crypto.randomUUID(),
    reviewer_name: review.reviewer_name ?? "",
    platform: review.platform === "tiktok" ? "tiktok" : "youtube",
    video_url: review.video_url ?? "",
    highlight_quote: review.highlight_quote ?? "",
  };
}

export function ReviewsEditor({ name, initialReviews = [] }: ReviewsEditorProps) {
  const [rows, setRows] = useState<ReviewRow[]>(
    initialReviews.length > 0 ? initialReviews.map(normalizeReview) : [createEmptyReview()],
  );

  const serializedValue = useMemo(() => {
    const cleaned = rows
      .map((row) => {
        const isBlank = !row.reviewer_name.trim() && !row.video_url.trim() && !row.highlight_quote.trim();
        if (isBlank) return null;

        return {
          reviewer_name: row.reviewer_name.trim(),
          platform: row.platform,
          video_url: row.video_url.trim(),
          highlight_quote: row.highlight_quote.trim() || null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return JSON.stringify(cleaned);
  }, [rows]);

  function updateRow(index: number, partial: Partial<ReviewRow>) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...partial } : row)));
  }

  function removeRow(index: number) {
    setRows((current) => {
      if (current.length <= 1) return [createEmptyReview()];
      return current.filter((_, rowIndex) => rowIndex !== index);
    });
  }

  function addRow() {
    setRows((current) => [...current, createEmptyReview()]);
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={serializedValue} />

      {rows.map((row, index) => (
        <div key={row.row_id} className="rounded-xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Review #{index + 1}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => removeRow(index)}>
              <Trash2 className="mr-1 h-4 w-4" />
              Hapus
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Reviewer</Label>
              <Input
                value={row.reviewer_name}
                onChange={(event) => updateRow(index, { reviewer_name: event.target.value })}
                placeholder="Nama reviewer"
              />
            </div>

            <div className="space-y-2">
              <Label>Platform</Label>
              <select
                value={row.platform}
                onChange={(event) => updateRow(index, { platform: event.target.value === "tiktok" ? "tiktok" : "youtube" })}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>URL Video</Label>
              <Input
                value={row.video_url}
                type="url"
                onChange={(event) => updateRow(index, { video_url: event.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Highlight Quote</Label>
              <textarea
                value={row.highlight_quote}
                onChange={(event) => updateRow(index, { highlight_quote: event.target.value })}
                className="min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="Ringkasan komentar reviewer"
              />
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addRow}>
        <Plus className="mr-1 h-4 w-4" />
        Tambah Review
      </Button>
    </div>
  );
}
