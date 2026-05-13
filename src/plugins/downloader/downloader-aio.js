const MAX_SIZE_MB = 50;
const MAX_SIZE = MAX_SIZE_MB * 1024 * 1024;
const toMB = (n) => (n / 1024 / 1024).toFixed(1);

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(
            `Contoh:\n${usedPrefix + command} https://vt.tiktok.com/xxxx`
        );
    }

    await global.loading(m, conn);

    try {
        const api = `https://api.zm.io.vn/v1/social/autolink?url=${encodeURIComponent(text)}`;
        const res = await fetch(api, {
            headers: { apikey: "yLwjqYzFFCoilIk5Ka" }
        });

        if (!res.ok) throw `API error ${res.status}`;

        const json = await res.json();
        if (json.error) throw json.message || "API error";

        const medias = json.medias || [];
        if (!medias.length) {
            throw `Link ${json.source || "ini"} tidak didukung`;
        }

        const videos = medias.filter(v => v.type === "video");
        const images = medias.filter(v => v.type === "image");
        const audio  = medias.find(v => v.type === "audio");
        const archive = medias.find(v =>
            !["video", "audio", "image"].includes(v.type)
        );

        /* ================== VIDEO ================== */
        if (videos.length) {
            const video =
                videos.find(v => v.quality === "hd_no_watermark") ||
                videos.find(v => v.quality === "no_watermark") ||
                videos[0];

            // data_size OPTIONAL
            if (!video.data_size || video.data_size <= MAX_SIZE) {
                return await conn.sendMessage(
                    m.chat,
                    {
                        video: { url: video.url },
                        caption:
                            `🎯 *ALL IN ONE DOWNLOADER*\n\n` +
                            `📌 Source: ${json.source}\n` +
                            `👤 Author: ${json.author || "-"}\n` +
                            `📛 Title: ${json.title || "-"}\n` +
                            `📐 Quality: ${video.quality || "-"}`
                    },
                    { quoted: m }
                );
            }

            // video besar → document
            return await conn.sendMessage(
                m.chat,
                {
                    document: { url: video.url },
                    fileName: `${json.title || "video"}.mp4`,
                    mimetype: "video/mp4",
                    caption:
                        `📄 *VIDEO (DOCUMENT MODE)*\n\n` +
                        `📐 Quality: ${video.quality || "-"}\n` +
                        `📦 Size: ${toMB(video.data_size)} MB`
                },
                { quoted: m }
            );
        }

        /* ================== IMAGE ================== */
        if (images.length) {
            const img = images[0];
            return await conn.sendMessage(
                m.chat,
                {
                    image: { url: img.url },
                    caption:
                        `🖼️ *IMAGE DOWNLOADER*\n\n` +
                        `📌 Source: ${json.source}\n` +
                        `👤 Author: ${json.author || "-"}\n` +
                        `📛 Title: ${json.title || "-"}\n` +
                        `📐 Resolution: ${img.resolution || "-"}`
                },
                { quoted: m }
            );
        }

        /* ================== AUDIO ================== */
        if (audio) {
            return await conn.sendMessage(
                m.chat,
                {
                    audio: { url: audio.url },
                    mimetype: audio.mimeType || "audio/mp4",
                    fileName: `${json.title || "audio"}.${audio.extension || "m4a"}`
                },
                { quoted: m }
            );
        }

        /* ================== ARCHIVE / DOCUMENT ================== */
        if (archive) {
            const ext = archive.extension || "bin";
            return await conn.sendMessage(
                m.chat,
                {
                    document: { url: archive.url },
                    fileName: `${json.title || "file"}.${ext}`,
                    mimetype: "application/octet-stream",
                    caption:
                        `📁 *FILE DOWNLOADER*\n\n` +
                        `📌 Source: ${json.source}\n` +
                        `📛 Type: ${archive.type}\n` +
                        `📦 Extension: .${ext}`
                },
                { quoted: m }
            );
        }

        throw "Media terdeteksi tapi tidak bisa diproses";

    } catch (err) {
        await m.reply(
            `❌ *Downloader gagal*\n\nAlasan: ${err}`
        );
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["aio"];
handler.tags = ["downloader"];
handler.command = /^(aio|allinone)$/i;

handler.desc = [
  "Downloader serba guna untuk berbagai platform media sosial",
  "Mendukung download video, gambar, audio, dan file",
  "Otomatis memilih kualitas terbaik tanpa watermark",
  "Menangani file besar dengan mode document",
  "Menampilkan metadata seperti author, judul, dan kualitas",
  "Menggunakan API autolink pihak ketiga"
];

export default handler;