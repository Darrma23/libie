import { sticker } from "#lib/sticker.js";

let searchCache = new Map();
let usedStickerIndex = new Map();

let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text) {
      return m.reply(`*Example:* ${usedPrefix + command} anime`);
    }

    await global.loading(m, conn);

    const timestamp = Date.now();
    const res = await fetch(
      "https://api.sticker.ly/v4/stickerPack/smartSearch",
      {
        method: "POST",
        headers: {
          "User-Agent":
            "androidapp.stickerly/3.25.2 (220333QAG; U; Android 30; ms-MY; id;)",
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip",
          "x-duid": Buffer.from(timestamp.toString()).toString("base64"),
        },
        body: JSON.stringify({
          keyword: text,
          enabledKeywordSearch: true,
          filter: {
            extendSearchResult: true,
            sortBy: "RECOMMENDED",
            languages: ["ALL"],
            minStickerCount: 10,
            searchBy: "ALL",
            stickerType: "ALL",
          },
        }),
      }
    );

    if (!res.ok) {
      return m.reply("Failed to fetch data from Sticker.ly");
    }

    const json = await res.json();
    const packs = json?.result?.stickerPacks || [];

    if (!packs.length) {
      return m.reply("Sticker not found!");
    }

    const validPacks = packs.filter(
      (p) => Array.isArray(p.resourceFiles) && p.resourceFiles.length >= 5
    );

    if (!validPacks.length) {
      return m.reply("There is no pack with enough stickers");
    }

    const cacheKey = `${text}-${m.sender}`;
    const packIndex = searchCache.get(cacheKey) || 0;
    const pack = validPacks[packIndex % validPacks.length];

    const usedKey = `${text}-${pack.packId}`;
    let used = usedStickerIndex.get(usedKey) || new Set();

    const available = pack.resourceFiles
      .map((file, i) => ({ file, i }))
      .filter((x) => !used.has(x.i));

    let picked = [];

    if (available.length >= 5) {
      picked = available.sort(() => Math.random() - 0.5).slice(0, 5);
    } else {
      used.clear();
      picked = pack.resourceFiles
        .map((file, i) => ({ file, i }))
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);
    }

    usedStickerIndex.set(
      usedKey,
      new Set(picked.map((x) => x.i))
    );
    searchCache.set(cacheKey, packIndex + 1);

    const prefix = pack.resourceUrlPrefix || "";
    let sent = 0;

    for (const { file } of picked) {
      try {
        const url = file.startsWith("http") ? file : prefix + file;
        const imgRes = await fetch(url);
        if (!imgRes.ok) continue;

        const buffer = Buffer.from(await imgRes.arrayBuffer());

        const stickerBuffer = await sticker(buffer, {
          packName: global.config?.stickpack || "Stickerly",
          authorName: global.config?.stickauth || "Libie",
          quality: 80,
        });

        await conn.sendMessage(
          m.chat,
          { sticker: stickerBuffer },
          { quoted: m }
        );

        sent++;
        await new Promise((r) => setTimeout(r, 400));
      } catch (e) {
        global.logger?.error(e);
      }
    }

    if (!sent) {
      await m.reply("All stickers failed to send");
    } else if (sent < 5) {
      await m.reply(`✅ ${sent} sticker sent successfully`);
    }
  } catch (e) {
    global.logger?.error(e);
    await m.reply("An error occurred while processing the sticker.");
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["stickerly"];
handler.tags = ["maker"];
handler.command = /^(stickerly|stikerly|stickersearch)$/i;

export default handler;