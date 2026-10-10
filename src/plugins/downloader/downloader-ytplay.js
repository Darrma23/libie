/**
 * @file YouTube Music downloader command handler
 * @module plugins/downloader/play
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Searches and downloads audio from YouTube Music
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} conn - Connection object
 * @param {Array} args - Command arguments
 * @param {string} usedPrefix - Command prefix used
 * @param {string} command - Command name
 * @returns {Promise<void>}
 *
 * @description
 * Searches for and downloads audio from YouTube Music by song title.
 * Returns audio with metadata including title, artist, and album art.
 *
 * @features
 * - Searches YouTube Music by song title
 * - Downloads audio with metadata preservation
 * - Displays album art and artist info in rich preview
 * - Shows loading indicators during processing
 * - Fetches audio FIRST (before canvas) to avoid URL expiry
 * - Validates download URL and handles size limit
 */
import { convert } from "#lib/convert.js";
import { play } from "#api/play.js";
import { canvas } from "#canvas/play.js";

/** Max audio size accepted for WhatsApp PTT (~25MB) */
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

/** Timeout for audio download (ms) */
const DOWNLOAD_TIMEOUT = 30000;

/**
 * Normalizes convert() output into a Buffer, or throws if shape is unknown
 * @param {unknown} converted
 * @returns {Buffer}
 */
function normalizeBuffer(converted) {
    if (Buffer.isBuffer(converted)) return converted;
    if (converted?.buffer) return Buffer.from(converted.buffer);
    if (converted?.data) return Buffer.from(converted.data);
    throw new Error("Konversi audio gagal: format buffer tidak dikenali");
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    const query = args.join(" ").trim();
    if (!query) {
        return m.reply(`Need song title\nEx: ${usedPrefix + command} Bye`);
    }

    await global.loading(m, conn);

    try {
        // 1) Resolve metadata + download URL
        const res = await play(query);
        if (!res.success) throw new Error(res.error || "Pencarian gagal");

        const { title, channel, cover, url, downloadUrl } = res;

        if (!downloadUrl || !/^https?:\/\//i.test(downloadUrl)) {
            throw new Error("Provider mengembalikan URL download tidak valid");
        }

        // 2) Fetch audio FIRST (URL gamma.123tokyo.xyz cepat expired)
        const audioRes = await fetch(downloadUrl, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
                "Referer": "https://www.youtube.com/",
                "Accept": "*/*",
            },
            signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT),
        });

        if (!audioRes.ok) {
            throw new Error(`Gagal unduh audio (HTTP ${audioRes.status}). Coba lagu lain.`);
        }

        const contentType = audioRes.headers.get("content-type") || "";
        if (/text\/html/i.test(contentType)) {
            throw new Error("Server balas HTML (bukan audio). URL kemungkinan expired.");
        }

        const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

        if (!audioBuffer.length) {
            throw new Error("File audio kosong");
        }
        if (audioBuffer.length > MAX_AUDIO_SIZE) {
            throw new Error("Audio terlalu besar (>25MB)");
        }

        // 3) Generate thumbnail canvas AFTER download (non time-critical)
        const canvasBuffer = await canvas(cover, title, channel).catch((e) => {
            global.logger?.warn?.("[play] canvas failed:", e?.message || e);
            return null;
        });

        // 4) Convert to Opus (PTT)
        const converted = await convert(audioBuffer, {
            format: "opus",
            bitrate: "128k",
            channels: 1,
            sampleRate: 48000,
            ptt: true,
        });

        const finalBuffer = normalizeBuffer(converted);
        if (!finalBuffer.length) {
            throw new Error("Konversi audio menghasilkan buffer kosong");
        }

        // 5) Send
        await conn.sendMessage(
            m.chat,
            {
                audio: finalBuffer,
                mimetype: "audio/ogg; codecs=opus",
                ptt: true,
                contextInfo: {
                    externalAdReply: {
                        title: title || "Unknown Title",
                        body: channel || "YouTube Music",
                        thumbnail: canvasBuffer || undefined,
                        mediaUrl: url || downloadUrl,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                    },
                },
            },
            { quoted: m }
        );
    } catch (e) {
        global.logger?.error?.(e);
        const raw = e?.message || String(e);
        const safe = /^(https?:|at |\/)/i.test(raw)
            ? "Gagal memproses audio. Coba lagi nanti."
            : raw;
        await m.reply(`Error: ${safe}`).catch(() => {});
    } finally {
        await global.loading(m, conn, true).catch(() => {});
    }
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 */
handler.help = ["play"];
handler.tags = ["downloader"];
handler.command = /^play$/i;

export default handler;