import Link from "next/link";
import { Smartphone, Facebook, Twitter, Instagram } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 pt-12 pb-8 mt-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand & Deskripsi */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 font-black text-xl text-slate-900 mb-4">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              CekHarga<span className="text-blue-600">.</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              Platform pintar untuk membandingkan harga HP baru dan bekas secara real-time. Temukan gadget impianmu dengan harga terbaik.
            </p>
          </div>

          {/* Link Cepat */}
          <div>
            <h4 className="font-bold text-slate-900 mb-4">Menu Pintar</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><Link href="/" className="hover:text-blue-600">Cari HP</Link></li>
              <li><Link href="/bandingkan" className="hover:text-blue-600">Bandingkan HP</Link></li>
              <li><Link href="/tentang" className="hover:text-blue-600">Tentang Kami</Link></li>
            </ul>
          </div>

          {/* Kategori Populer */}
          <div>
            <h4 className="font-bold text-slate-900 mb-4">Brand Populer</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>iPhone</li>
              <li>Samsung Galaxy</li>
              <li>Xiaomi / Redmi</li>
              <li>Infinix</li>
            </ul>
          </div>

          {/* Kontak */}
          <div>
            <h4 className="font-bold text-slate-900 mb-4">Ikuti Kami</h4>
            <div className="flex gap-4">
               <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors">
                 <Instagram className="w-4 h-4" />
               </div>
               <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors">
                 <Twitter className="w-4 h-4" />
               </div>
               <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors">
                 <Facebook className="w-4 h-4" />
               </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-8 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} CekHarga Gadget Indonesia. All rights reserved.
        </div>
      </div>
    </footer>
  );
}