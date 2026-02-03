// File: src/types/index.ts

export interface Spesifikasi {
  id: number;
  id_produk: number;
  
  // 1. Body
  teknologi_jaringan?: string;
  dimensi?: string;
  berat?: string;
  rating_ip?: string;

  // 2. Layar
  tipe_layar?: string;
  ukuran_layar?: number;
  resolusi?: string;
  proteksi_layar?: string;

  // 3. Platform
  os?: string;
  chipset?: string;
  
  // 4. Memori
  ada_slot_memori?: boolean; // atau number (0/1) dari database
  varian_internal?: string; // JSON String
  tipe_memori?: string;

  // 5. Kamera
  kamera_utama_mp?: number;
  detail_kamera_utama?: string;
  video_kamera_utama?: string;
  kamera_selfie_mp?: number;
  detail_kamera_selfie?: string;
  kamera_selfie_video?: string;

  // 5b. Sound
  sound_loudspeaker?: string;
  sound_jack?: boolean;

  // 5c. Video
  kamera_utama_video?: string;

  // 5d. Comms
  comms_wlan?: string;
  comms_bluetooth?: string;
  comms_gps?: string;
  comms_usb?: string;

  // 6. Fitur & Baterai
  ada_nfc?: boolean; // atau number (0/1)
  ada_jack_audio?: boolean;
  kapasitas_baterai?: number;
  kecepatan_cas?: string;
  sensor?: string;

  // 7. Skor & Kesimpulan
  skor_antutu?: number;
  skor_geekbench?: number;
  bintang_performa?: number;
  bintang_kamera?: number;
  bintang_baterai?: number;
  kesimpulan_singkat?: string;
}

export interface MarketplaceLink {
  id: number;
  nama_marketplace: string; // shopee, tokopedia, dll
  nama_toko: string;
  harga: number;
  url_produk: string;
  kondisi: 'baru' | 'bekas';
  status_aktif: boolean;
}

export interface Produk {
  id: number;
  nama_produk: string;
  slug: string;
  foto?: string; // tanda tanya artinya boleh kosong
  id_brand: number;
  tahun_rilis: string;
  harga_terendah_baru: number;
  harga_terendah_bekas: number;
  
  // Relasi ke spesifikasi (Optional karena di list produk mungkin tidak di-load)
  spesifikasi?: Spesifikasi;

  marketplace_links?: MarketplaceLink[]; // sesuaikan dengan nama relasi di JSON API
  brand?: Brand; // relasi ke brand
  marketplace?: MarketplaceLink;
}
export interface Brand {
  id: number;
  nama_brand: string;
  slug: string;
  logo: string | null;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
}