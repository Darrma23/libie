/**
 * @file WebP sticker conversion utility using FFmpeg (local)
 * @module lib/sticker
 */

import webp from "node-webpmux"

/* ================= IMAGE → WEBP ================= */

export async function imageToWebp(buffer, options = {}) {
  const { quality = 90 } = options

  const proc = Bun.spawn([
    "ffmpeg",
    "-i", "pipe:0",

    "-vcodec", "libwebp",
    "-vf",
    "scale=320:320:force_original_aspect_ratio=decrease," +
    "pad=320:320:-1:-1:color=#00000000",

    "-q:v", String(quality),
    "-f", "webp",
    "pipe:1"
  ], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe"
  })

  proc.stdin.write(buffer)
  proc.stdin.end()

  const exitCode = await proc.exited

  if (exitCode !== 0) {
    const err = await new Response(proc.stderr).text()
    throw new Error("FFmpeg image conversion failed:\n" + err)
  }

  const output = await new Response(proc.stdout).arrayBuffer()
  return Buffer.from(output)
}

/* ================= VIDEO/GIF → WEBP ================= */

export async function videoToWebp(buffer, options = {}) {
  const { fps = 15, maxDuration = 10 } = options

  const proc = Bun.spawn([
    "ffmpeg",
    "-i", "pipe:0",

    "-t", String(maxDuration),

    "-vf", `fps=${fps},scale=320:320:force_original_aspect_ratio=decrease`,
    "-loop", "0",

    "-vcodec", "libwebp",
    "-f", "webp",
    "pipe:1"
  ], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe"
  })

  proc.stdin.write(buffer)
  proc.stdin.end()

  const exitCode = await proc.exited

  if (exitCode !== 0) {
    const err = await new Response(proc.stderr).text()
    throw new Error("FFmpeg video conversion failed:\n" + err)
  }

  const output = await new Response(proc.stdout).arrayBuffer()
  return Buffer.from(output)
}

/* ================= ADD EXIF ================= */

export async function addExif(webpBuffer, metadata = {}) {
  if (!Buffer.isBuffer(webpBuffer)) {
    throw new Error("Input must be a WebP Buffer")
  }

  /* Validasi ringan WEBP */
  const isWebp =
    webpBuffer[0] === 0x52 && // R
    webpBuffer[1] === 0x49 && // I
    webpBuffer[2] === 0x46 && // F
    webpBuffer[3] === 0x46 && // F
    webpBuffer[8] === 0x57 && // W
    webpBuffer[9] === 0x45 && // E
    webpBuffer[10] === 0x42 && // B
    webpBuffer[11] === 0x50   // P

  if (!isWebp) {
    throw new Error("Invalid WebP buffer")
  }

  const img = new webp.Image()

  const exifData = {
    "sticker-pack-id": metadata.packId || `pack-${Date.now()}`,
    "sticker-pack-name": metadata.packName || "Sticker",
    "sticker-pack-publisher": metadata.packPublish || "Bot",
    emojis: metadata.emojis || ["😎"],
    "is-avatar-sticker": metadata.isAvatar || 0
  }

  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2A, 0x00,
    0x08, 0x00, 0x00, 0x00,
    0x01, 0x00,
    0x41, 0x57, 0x07, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x16, 0x00, 0x00, 0x00
  ])

  const jsonBuffer = Buffer.from(JSON.stringify(exifData), "utf-8")
  const exif = Buffer.concat([exifAttr, jsonBuffer])

  exif.writeUIntLE(jsonBuffer.length, 14, 4)

  await img.load(webpBuffer)
  img.exif = exif

  return await img.save(null)
}

/* ================= MAIN STICKER FUNCTION ================= */

export async function sticker(buffer, options = {}) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Input must be a Buffer")
  }

  if (!buffer.length) {
    throw new Error("Empty buffer")
  }

  let isVideo = false

  /* GIF */
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    isVideo = true
  }

  /* WEBP */
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return addExif(buffer, {
      packName: options.packName,
      packPublish: options.authorName,
      emojis: options.emojis
    })
  }

  /* MP4 / WEBM */
  if (
    (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) || // ftyp
    (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3)
  ) {
    isVideo = true
  }

  let webpBuffer

  if (isVideo) {
    webpBuffer = await videoToWebp(buffer, {
      fps: options.fps || 15,
      maxDuration: options.maxDuration || 10
    })
  } else {
    webpBuffer = await imageToWebp(buffer, {
      quality: options.quality || 90
    })
  }

  const result = await addExif(webpBuffer, {
    packName: options.packName,
    packPublish: options.authorName,
    emojis: options.emojis
  })

  return result
}