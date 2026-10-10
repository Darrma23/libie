/**
 * @file YouTube Music search and download utility
 * @module downloader/play
 * @description Multi-endpoint YouTube Music search and downloader.
 * Prioritizes FAA (cdn.aceimg.com) — URL stabil, tidak cepat expired.
 * Blacklists gamma.123tokyo.xyz — URL expired instan (403 Cloudflare).
 * @license Apache-2.0
 * @author Himejima
 */

/** URL yang mengandung domain expired/blocked → skip */
const EXPIRED_URL_PATTERN = /gamma\.123tokyo\.xyz/i;

/**
 * Validates a string is a proper HTTP(S) URL and not from an expired domain
 * @param {unknown} u
 * @returns {boolean}
 */
function isUsableUrl(u) {
    if (typeof u !== "string") return false;
    if (u.length < 10) return false;
    if (!/^https?:\/\//i.test(u)) return false;
    if (EXPIRED_URL_PATTERN.test(u)) return false;
    return true;
}

/**
 * Searches and retrieves YouTube Music track with metadata and download URL
 * @async
 * @function play
 * @param {string} query - Search query (song title, artist, YouTube URL)
 * @returns {Promise<Object>} Track information and download data
 */
export async function play(query) {
    if (!query || typeof query !== "string" || !query.trim()) {
        return { success: false, error: "Query kosong atau tidak valid." };
    }

    const encoded = encodeURIComponent(query.trim());

    /**
     * API endpoints — urutan prioritas:
     *  1. faa        ✅ live, URL stabil (cdn.aceimg.com)
     *  2. jerexd     ⚡ live, URL cepat expired (gamma) → akan di-skip oleh isUsableUrl
     *  3. elrayyxml  ⚡ live, URL cepat expired (gamma) → akan di-skip
     *
     * azbry (502) & anabot (async task) dihapus.
     */
    const endpoints = [
        `https://api-faa.my.id/faa/ytplay?query=${encoded}`,
        `https://api.jerexd.my.id/api/downloader/play?apikey=jere_LMOR6_JPZ92O&q=${encoded}`,
        `https://api.elrayyxml.web.id/api/downloader/ytplay?q=${encoded}`,
    ];

    for (const endpoint of endpoints) {
        let res;
        try {
            res = await fetch(endpoint, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
                    "Accept": "application/json, */*",
                },
                signal: AbortSignal.timeout(15000),
            });
        } catch (e) {
            console.warn(`[play] fetch failed: ${endpoint} → ${e.message}`);
            continue;
        }

        if (!res.ok) {
            console.warn(`[play] HTTP ${res.status} from ${endpoint}`);
            continue;
        }

        let json;
        try {
            json = await res.json();
        } catch {
            console.warn(`[play] invalid JSON from ${endpoint}`);
            continue;
        }

        if (!json || typeof json !== "object") continue;

        // ---------- FAA: { status: true, result: { mp3, title, author } } ----------
        if (
            json.status === true &&
            json.result &&
            typeof json.result === "object"
        ) {
            const url = json.result.mp3;
            if (isUsableUrl(url) && json.result.title) {
                return {
                    success: true,
                    title: json.result.title || "Unknown Title",
                    channel: json.result.author || "Unknown Artist",
                    cover: isUsableUrl(json.result.thumbnail)
                        ? json.result.thumbnail
                        : null,
                    url: isUsableUrl(json.result.url) ? json.result.url : null,
                    downloadUrl: url,
                };
            }
        }

        // ---------- Jerexd: { status: true, result: { download, title, channel } } ----------
        if (
            json.status === true &&
            json.result &&
            typeof json.result === "object"
        ) {
            const url = json.result.download || json.result.downloadUrl;
            if (isUsableUrl(url) && json.result.title) {
                return {
                    success: true,
                    title: json.result.title || "Unknown Title",
                    channel: json.result.channel || "Unknown Artist",
                    cover: isUsableUrl(json.result.thumbnail)
                        ? json.result.thumbnail
                        : null,
                    url: isUsableUrl(json.result.url) ? json.result.url : null,
                    downloadUrl: url,
                };
            }
        }

        // ---------- Elrayyxml: { status: true, result: { download_url, ... } } ----------
        if (
            json.status === true &&
            json.result &&
            typeof json.result === "object"
        ) {
            const url = json.result.download_url;
            if (isUsableUrl(url) && json.result.title) {
                return {
                    success: true,
                    title: json.result.title || "Unknown Title",
                    channel: json.result.channel || "Unknown Artist",
                    cover: isUsableUrl(json.result.thumbnail)
                        ? json.result.thumbnail
                        : null,
                    url: isUsableUrl(json.result.url) ? json.result.url : null,
                    downloadUrl: url,
                };
            }
        }

        // ---------- Generic fallbacks (future providers) ----------
        if (json.result && typeof json.result === "object") {
            const candidates = [
                json.result.download,
                json.result.downloadUrl,
                json.result.download_url,
                json.result.mp3,
                json.data?.result?.urls,
            ];
            const url = candidates.find(isUsableUrl);
            if (url) {
                return {
                    success: true,
                    title: json.result.title || json.data?.result?.metadata?.title || "Unknown Title",
                    channel:
                        json.result.channel ||
                        json.result.author ||
                        json.data?.result?.metadata?.channel ||
                        "Unknown Artist",
                    cover:
                        (isUsableUrl(json.result.thumbnail) && json.result.thumbnail) ||
                        (isUsableUrl(json.result.image) && json.result.image) ||
                        null,
                    url: isUsableUrl(json.result.url) ? json.result.url : null,
                    downloadUrl: url,
                };
            }
        }
    }

    return {
        success: false,
        error:
            "Tidak ada provider yang mengembalikan URL download valid saat ini. Coba lagi nanti.",
    };
}