import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

export default function Pagination({ currentPage, lastPage, onPageChange, isLoading }: PaginationProps) {
  // Jangan tampilkan jika halaman cuma 1
  if (lastPage <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 mt-10 animate-in fade-in slide-in-from-bottom-4">
      
      {/* Tombol Previous */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || isLoading}
        className="gap-1 pl-2.5"
      >
        <ChevronLeft className="h-4 w-4" />
        Prev
      </Button>

      {/* Info Halaman */}
      <div className="text-sm font-medium text-slate-600">
        Halaman <span className="text-slate-900 font-bold">{currentPage}</span> dari <span className="text-slate-900 font-bold">{lastPage}</span>
      </div>

      {/* Tombol Next */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === lastPage || isLoading}
        className="gap-1 pr-2.5"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}