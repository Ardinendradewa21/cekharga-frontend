"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Ambil nilai awal dari URL kalau ada (misal ?q=iphone)
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault(); // Cegah reload halaman
    
    // Update URL browser
    if (query.trim()) {
      router.push(`/?q=${encodeURIComponent(query)}`);
    } else {
      router.push("/"); // Kalau kosong, balik ke home awal
    }
  };

  return (
    <form onSubmit={handleSearch} className="max-w-xl mx-auto relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
      <div className="relative flex bg-white p-2 rounded-xl shadow-xl shadow-slate-200/40 border border-slate-100 items-center">
        <Search className="w-6 h-6 text-slate-400 ml-3 shrink-0" />
        <Input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari gadget impianmu (cth: iPhone)..." 
          className="border-0 shadow-none focus-visible:ring-0 text-lg py-3 px-4 text-slate-700 placeholder:text-slate-400 bg-transparent"
        />
        <Button type="submit" size="lg" className="shrink-0 bg-slate-900 hover:bg-blue-600 text-white px-8 rounded-lg transition-colors">
          Cari
        </Button>
      </div>
    </form>
  );
}