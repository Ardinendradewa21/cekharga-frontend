"use client";

import { useState } from "react";
import { MarketplaceLink } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, ExternalLink, Store } from "lucide-react";

interface PriceListProps {
  links?: MarketplaceLink[];
}

export default function PriceList({ links = [] }: PriceListProps) {
  const [activeTab, setActiveTab] = useState<'baru' | 'bekas'>('baru');

  // 1. Filter link yang aktif saja
  const activeLinks = links.filter(l => l.status_aktif);

  // 2. Filter berdasarkan Tab (Baru/Bekas)
  const filteredLinks = activeLinks
    .filter(l => l.kondisi === activeTab)
    .sort((a, b) => Number(a.harga) - Number(b.harga)); // Urutkan termurah

  // Helper Format Rupiah
  const formatRupiah = (num: number) => 
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);

  // Helper Warna Marketplace
  const getMarketplaceStyle = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('shopee')) return "bg-orange-500 hover:bg-orange-600 text-white";
    if (n.includes('tokopedia')) return "bg-green-600 hover:bg-green-700 text-white";
    if (n.includes('tiktok')) return "bg-black hover:bg-gray-800 text-white";
    if (n.includes('blibli')) return "bg-blue-500 hover:bg-blue-600 text-white";
    if (n.includes('lazada')) return "bg-indigo-600 hover:bg-indigo-700 text-white";
    return "bg-slate-900 hover:bg-slate-800 text-white";
  };

  if (activeLinks.length === 0) return null; // Sembunyikan section kalau kosong

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mt-8 scroll-mt-24" id="harga-toko">
      
      {/* HEADER & TABS */}
      <div className="bg-slate-50 border-b border-slate-200 p-1 flex items-center justify-between">
        <div className="flex p-1 gap-1 bg-slate-200/50 rounded-lg mx-2 my-1">
           <button 
             onClick={() => setActiveTab('baru')}
             className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'baru' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Unit Baru
           </button>
           <button 
             onClick={() => setActiveTab('bekas')}
             className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'bekas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Unit Bekas
           </button>
        </div>
        <div className="px-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
           Pilihan Toko Terbaik
        </div>
      </div>

      {/* LIST ITEM */}
      <div className="divide-y divide-slate-100">
        {filteredLinks.length > 0 ? (
          filteredLinks.map((link, index) => (
            <div key={link.id} className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-blue-50/30 transition-colors gap-4">
              
              {/* Info Kiri */}
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${getMarketplaceStyle(link.nama_marketplace)} bg-opacity-10 text-opacity-100`}>
                   <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                   <div className="flex items-center gap-2">
                     <span className="font-bold text-lg text-slate-900">{formatRupiah(link.harga)}</span>
                     {index === 0 && (
                       <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-2 py-0 hover:bg-green-100">Termurah</Badge>
                     )}
                   </div>
                   <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <Store className="w-3 h-3" /> {link.nama_toko}
                      <span className="text-slate-300">•</span>
                      <span className="capitalize">{link.nama_marketplace}</span>
                   </div>
                </div>
              </div>

              {/* Tombol Kanan */}
              <a href={link.url_produk} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button size="sm" className={`w-full sm:w-auto gap-2 font-bold shadow-sm ${getMarketplaceStyle(link.nama_marketplace)}`}>
                  Beli Sekarang <ExternalLink className="w-3 h-3 opacity-70" />
                </Button>
              </a>

            </div>
          ))
        ) : (
          <div className="p-8 text-center text-slate-400 text-sm">
            Belum ada data toko untuk kategori ini.
          </div>
        )}
      </div>
    </div>
  );
}