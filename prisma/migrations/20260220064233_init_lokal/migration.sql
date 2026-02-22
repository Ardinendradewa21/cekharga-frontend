-- CreateEnum
CREATE TYPE "produk_status" AS ENUM ('aktif', 'draft');

-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "email_verified_at" TIMESTAMP(0),
    "password" VARCHAR(255) NOT NULL,
    "remember_token" VARCHAR(100),
    "created_at" TIMESTAMP(0),
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" BIGSERIAL NOT NULL,
    "nama_brand" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "logo" VARCHAR(255),
    "created_at" TIMESTAMP(0),
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplaces" (
    "id" BIGSERIAL NOT NULL,
    "nama" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "logo" VARCHAR(255),
    "warna_hex" VARCHAR(255) NOT NULL DEFAULT '#000000',
    "text_color" VARCHAR(255) NOT NULL DEFAULT '#ffffff',
    "created_at" TIMESTAMP(0),
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "marketplaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produk" (
    "id" BIGSERIAL NOT NULL,
    "nama_produk" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "foto" VARCHAR(255),
    "id_brand" BIGINT NOT NULL DEFAULT 1,
    "tahun_rilis" INTEGER,
    "harga_terendah_baru" DECIMAL(15,2),
    "harga_terendah_bekas" DECIMAL(15,2),
    "status" "produk_status" NOT NULL DEFAULT 'aktif',
    "jumlah_dilihat" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(0),
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "produk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spesifikasi_produk" (
    "id" BIGSERIAL NOT NULL,
    "id_produk" BIGINT NOT NULL,
    "teknologi_jaringan" VARCHAR(255),
    "tanggal_rilis" DATE,
    "dimensi" VARCHAR(255),
    "berat" VARCHAR(255),
    "rating_ip" VARCHAR(255),
    "tipe_layar" VARCHAR(255),
    "ukuran_layar" DECIMAL(4,1),
    "resolusi" VARCHAR(255),
    "proteksi_layar" VARCHAR(255),
    "os" VARCHAR(255),
    "chipset" VARCHAR(255),
    "ada_slot_memori" BOOLEAN NOT NULL DEFAULT false,
    "varian_internal" JSONB,
    "tipe_memori" VARCHAR(255),
    "kamera_utama_mp" INTEGER,
    "detail_kamera_utama" TEXT,
    "kamera_utama_video" VARCHAR(255),
    "video_kamera_utama" VARCHAR(255),
    "kamera_selfie_mp" INTEGER,
    "kamera_selfie_video" VARCHAR(255),
    "detail_kamera_selfie" TEXT,
    "ada_nfc" BOOLEAN NOT NULL DEFAULT false,
    "ada_jack_audio" BOOLEAN NOT NULL DEFAULT false,
    "kapasitas_baterai" INTEGER,
    "kecepatan_cas" VARCHAR(255),
    "sensor" TEXT,
    "skor_antutu" INTEGER,
    "skor_geekbench" INTEGER,
    "skor_dxomark" INTEGER,
    "bintang_performa" INTEGER NOT NULL DEFAULT 0,
    "bintang_kamera" INTEGER NOT NULL DEFAULT 0,
    "bintang_baterai" INTEGER NOT NULL DEFAULT 0,
    "kesimpulan_singkat" VARCHAR(255),
    "created_at" TIMESTAMP(0),
    "updated_at" TIMESTAMP(0),
    "sound_loudspeaker" VARCHAR(255),
    "sound_jack" VARCHAR(255),
    "comms_wlan" VARCHAR(255),
    "comms_bluetooth" VARCHAR(255),
    "comms_gps" VARCHAR(255),
    "comms_usb" VARCHAR(255),

    CONSTRAINT "spesifikasi_produk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_links" (
    "id" BIGSERIAL NOT NULL,
    "produk_id" BIGINT NOT NULL,
    "marketplace_id" BIGINT,
    "nama_marketplace" VARCHAR(255) NOT NULL,
    "nama_toko" VARCHAR(255),
    "harga" DECIMAL(15,2) NOT NULL,
    "url_produk" TEXT NOT NULL,
    "kondisi" VARCHAR(255) NOT NULL DEFAULT 'baru',
    "status_aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(0),
    "updated_at" TIMESTAMP(0),

    CONSTRAINT "marketplace_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" BIGSERIAL NOT NULL,
    "produk_id" BIGINT NOT NULL,
    "reviewer_name" VARCHAR(255) NOT NULL,
    "platform" VARCHAR(50) NOT NULL,
    "video_url" TEXT NOT NULL,
    "highlight_quote" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_unique" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_unique" ON "brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "produk_slug_unique" ON "produk"("slug");

-- CreateIndex
CREATE INDEX "produk_id_brand_index" ON "produk"("id_brand");

-- CreateIndex
CREATE INDEX "produk_harga_terendah_baru_index" ON "produk"("harga_terendah_baru");

-- CreateIndex
CREATE INDEX "produk_harga_terendah_bekas_index" ON "produk"("harga_terendah_bekas");

-- CreateIndex
CREATE INDEX "spesifikasi_produk_id_produk_foreign" ON "spesifikasi_produk"("id_produk");

-- CreateIndex
CREATE INDEX "spesifikasi_produk_rating_ip_index" ON "spesifikasi_produk"("rating_ip");

-- CreateIndex
CREATE INDEX "spesifikasi_produk_ukuran_layar_index" ON "spesifikasi_produk"("ukuran_layar");

-- CreateIndex
CREATE INDEX "spesifikasi_produk_chipset_index" ON "spesifikasi_produk"("chipset");

-- CreateIndex
CREATE INDEX "spesifikasi_produk_kamera_utama_mp_index" ON "spesifikasi_produk"("kamera_utama_mp");

-- CreateIndex
CREATE INDEX "spesifikasi_produk_ada_nfc_index" ON "spesifikasi_produk"("ada_nfc");

-- CreateIndex
CREATE INDEX "spesifikasi_produk_kapasitas_baterai_index" ON "spesifikasi_produk"("kapasitas_baterai");

-- CreateIndex
CREATE INDEX "spesifikasi_produk_skor_antutu_index" ON "spesifikasi_produk"("skor_antutu");

-- CreateIndex
CREATE INDEX "marketplace_links_produk_id_foreign" ON "marketplace_links"("produk_id");

-- CreateIndex
CREATE INDEX "marketplace_links_marketplace_id_foreign" ON "marketplace_links"("marketplace_id");

-- CreateIndex
CREATE INDEX "reviews_produk_id_index" ON "reviews"("produk_id");

-- AddForeignKey
ALTER TABLE "produk" ADD CONSTRAINT "produk_id_brand_fkey" FOREIGN KEY ("id_brand") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spesifikasi_produk" ADD CONSTRAINT "spesifikasi_produk_id_produk_fkey" FOREIGN KEY ("id_produk") REFERENCES "produk"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "marketplace_links" ADD CONSTRAINT "marketplace_links_marketplace_id_fkey" FOREIGN KEY ("marketplace_id") REFERENCES "marketplaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "marketplace_links" ADD CONSTRAINT "marketplace_links_produk_id_fkey" FOREIGN KEY ("produk_id") REFERENCES "produk"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_produk_id_foreign" FOREIGN KEY ("produk_id") REFERENCES "produk"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
