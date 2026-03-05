import { sticker } from "#lib/sticker.js";

async function fetchBuffer(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const buffer = Buffer.from(await res.arrayBuffer());

      if (!buffer || buffer.length === 0)
        throw new Error("Buffer kosong / corrupt");

      return buffer;

    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  try {
    if (!args.length) {
      return m.reply(`Text mana?\nContoh: ${usedPrefix + command} Halo dunia`);
    }

    await global.loading(m, conn);

    const text = encodeURIComponent(args.join(" "));
    const url = `https://libieapiofficial.dpdns.org/api/maker/bratgura?q=${text}`;

    const buffer = await fetchBuffer(url);

    const stiker = await sticker(buffer, {
      packName: global.config.stickpack,
      authorName: global.config.stickauth
    });

    await conn.sendMessage(
      m.chat,
      { sticker: stiker },
      { quoted: m }
    );

  } catch (e) {
    global.logger.error(e);
    m.reply(`Error: ${e.message}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["bratgura"];
handler.tags = ["maker"];
handler.command = /^(bratgura)$/i;

export default handler;