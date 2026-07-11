# Libie Architecture

## Overview

Libie adalah framework WhatsApp berbasis Bun + Baileys dengan arsitektur plugin.

Tujuan utama:

- Modular
- Ringan
- Cepat
- Mudah dikembangkan

---

## Request Flow

WhatsApp

↓

Baileys Socket

↓

src/lib/core/socket.js

↓

src/lib/core/message.js

↓

src/handler.js

↓

Plugin Loader

↓

src/plugins/*

↓

Database / API / Canvas

↓

Response

---

## Core Components

src/main.js
Entry point.

src/config.js
Global configuration.

src/handler.js
Dispatcher semua command.

src/lib/core/
Engine utama.

src/lib/database.js
SQLite abstraction.

src/plugins/
Semua fitur bot.

---

## Design Principles

- Plugin Based
- Event Driven
- Low Memory
- High Performance
- Minimal Dependencies