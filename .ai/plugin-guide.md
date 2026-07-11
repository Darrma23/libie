# Plugin Guide

Semua fitur baru wajib dibuat sebagai plugin.

## Struktur

Plugin harus memiliki:

- command
- help
- tags

Gunakan metadata yang sudah menjadi standar project.

## Rules

Jangan:

- akses database langsung jika helper sudah ada
- duplicate command
- duplicate regex

Gunakan utilitas dari src/lib jika tersedia.

## Naming

Kategori-nama.js

Contoh

group-tagall.js

tool-speed.js

owner-eval.js