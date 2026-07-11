# Database

Database utama menggunakan SQLite.

Lokasi utama:

src/lib/database.js

## Prinsip

Jangan membuat schema baru tanpa alasan.

Gunakan helper database yang sudah tersedia.

## Prioritas

- sedikit query
- gunakan cache jika ada
- hindari query berulang

## Migration

Jika mengubah schema:

- jelaskan alasannya
- pastikan backward compatible