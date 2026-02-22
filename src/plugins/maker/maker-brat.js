import { sticker } from "#lib/sticker.js";

async function fetchBuffer(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const buffer = Buffer.from(await res.arrayBuffer());

      if (buffer.length < 2000)
        throw new Error("Buffer terlalu kecil / corrupt");

      return buffer;

    } catch (err) {
      if (i === retries - 1) throw err;
    }
  }
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  try {
    if (!args[0])
      return m.reply(`Text mana?\nContoh: ${usedPrefix + command} Halo dunia`);

    await global.loading(m, conn);

    const text = encodeURIComponent(args.join(" "));
    const endpoint =
      command === "bratvid"
        ? `https://zelapioffciall.koyeb.app/canvas/bratvid?text=${text}`
        : `https://zelapioffciall.koyeb.app/canvas/bratv2?text=${text}`;

    const buffer = await fetchBuffer(endpoint);

    const stiker = await sticker(buffer, {
      packName: global.config.stickpack,
      authorName: global.config.stickauth,
    });

    await conn.sendMessage(m.chat, { sticker: stiker }, { quoted: m });

  } catch (e) {
    global.logger.error(e);
    m.reply(`Error: ${e.message}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["brat", "bratvid"];
handler.tags = ["maker"];
handler.command = /^(brat|bratvid)$/i;

export default handler;