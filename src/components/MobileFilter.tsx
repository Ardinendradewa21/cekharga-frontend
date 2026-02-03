"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Filter } from "lucide-react";
import FilterSidebar, { FilterState } from "./FilterSidebar";
import { useState } from "react";

interface MobileFilterProps {
  onFilterChange: (filters: FilterState) => void;
}

export default function MobileFilter({ onFilterChange }: MobileFilterProps) {
  const [open, setOpen] = useState(false);

  // Wrapper function agar saat filter di-apply, Sheet otomatis tertutup
  const handleFilterChange = (filters: FilterState) => {
    onFilterChange(filters);
    setOpen(false); // Tutup drawer setelah user klik Apply
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* TOMBOL PEMICU (Hanya muncul di Mobile) */}
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden gap-2 bg-white border-slate-300 text-slate-700">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
      </SheetTrigger>

      {/* ISI DRAWER (Muncul dari Kiri) */}
      <SheetContent side="left" className="w-75 sm:w-75 p-0 overflow-y-auto">
        
        <SheetHeader className="px-5 pt-5 pb-0 text-left">
          <SheetTitle>Filter Produk</SheetTitle>
          <SheetDescription>
            Sesuaikan pencarian HP idamanmu.
          </SheetDescription>
        </SheetHeader>

        {/* Panggil Logic Sidebar yang sudah ada */}
        {/* Kita hilangkan border & shadow karena sudah di dalam sheet */}
        <FilterSidebar 
          onFilterChange={handleFilterChange} 
          className="border-none shadow-none sticky-0"
        />
        
      </SheetContent>
    </Sheet>
  );
}