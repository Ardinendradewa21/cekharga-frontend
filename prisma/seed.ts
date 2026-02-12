import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  const apple = await prisma.brand.upsert({
    where: { slug: "apple" },
    update: { nama_brand: "Apple", updated_at: now },
    create: {
      nama_brand: "Apple",
      slug: "apple",
      created_at: now,
      updated_at: now,
    },
  });

  const existing = await prisma.product.findUnique({
    where: { slug: "iphone-15-128gb-ibox" },
    select: { id: true },
  });

  if (existing) {
    console.log("Seed skipped: produk contoh sudah ada.");
    return;
  }

  const product = await prisma.product.create({
    data: {
      nama_produk: "iPhone 15 128GB",
      slug: "iphone-15-128gb-ibox",
      foto: "https://ibox.co.id/media/catalog/product/i/p/iphone_15_pink.jpg",
      id_brand: apple.id,
      tahun_rilis: 2023,
      harga_terendah_baru: 16499000,
      harga_terendah_bekas: 11500000,
      status: "aktif",
      jumlah_dilihat: BigInt(0),
      created_at: now,
      updated_at: now,
    },
    select: { id: true },
  });

  await prisma.specification.create({
    data: {
      id_produk: product.id,
      chipset: "Apple A16 Bionic",
      varian_internal: "128GB",
      ukuran_layar: 6.1,
      tipe_layar: "Super Retina XDR OLED",
      kamera_utama_mp: 48,
      kapasitas_baterai: 3349,
      ada_nfc: true,
      created_at: now,
      updated_at: now,
    },
  });

  await prisma.marketplaceLink.createMany({
    data: [
      {
        produk_id: product.id,
        nama_marketplace: "Shopee",
        nama_toko: "iBox Official",
        harga: 16499000,
        url_produk: "https://shopee.co.id/iphone-15",
        kondisi: "baru",
        status_aktif: true,
        created_at: now,
        updated_at: now,
      },
      {
        produk_id: product.id,
        nama_marketplace: "Tokopedia",
        nama_toko: "PS Store",
        harga: 12000000,
        url_produk: "https://tokopedia.com/psstore/iphone-15-bekas",
        kondisi: "bekas",
        status_aktif: true,
        created_at: now,
        updated_at: now,
      },
    ],
  });

  console.log("Seed created: iPhone 15 128GB");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

