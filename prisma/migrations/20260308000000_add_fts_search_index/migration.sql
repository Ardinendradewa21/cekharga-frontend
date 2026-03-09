-- =============================================================================
-- Migration: Full-Text Search (FTS) Index untuk CekHarga
-- =============================================================================
--
-- MENGAPA 'simple' bukan 'english' atau 'indonesian'?
--
--   - 'english' melakukan stemming (running → run, phones → phone).
--     Stemming berbahaya untuk nama produk HP: "A55" tidak boleh di-stem,
--     "Snapdragon" tidak boleh diubah. Hasil search bisa meleset.
--
--   - 'indonesian' tidak tersedia secara default di instalasi PostgreSQL standar
--     dan perlu extension tambahan. Tidak praktis untuk production langsung.
--
--   - 'simple' hanya melakukan lowercase + tokenisasi tanpa stemming dan tanpa
--     penghapusan stopword. Ini ideal untuk proper noun seperti nama HP, brand,
--     dan chipset.
--
-- MENGAPA GIN bukan GiST?
--
--   - GIN (Generalized Inverted Index) lebih cepat untuk LOOKUP (search queries).
--   - GiST lebih cepat untuk UPDATE (tiap kali data berubah).
--   - CekHarga adalah read-heavy workload (banyak search, jarang update nama produk),
--     sehingga GIN adalah pilihan yang tepat.
--
-- =============================================================================

-- Index FTS pada kolom nama_produk di tabel utama produk.
-- Ini adalah index yang dipakai saat user mengetik di search bar homepage.
CREATE INDEX IF NOT EXISTS idx_product_fts_nama
  ON table_product
  USING GIN (to_tsvector('simple', nama_produk));

-- Index FTS pada kolom nama_brand di tabel brands.
-- Ini memungkinkan pencarian "Samsung" menemukan produk melalui relasi brand-nya,
-- tidak hanya dari nama produk yang mungkin tidak menyebutkan nama brand secara eksplisit.
CREATE INDEX IF NOT EXISTS idx_brand_fts_nama
  ON brands
  USING GIN (to_tsvector('simple', nama_brand));
