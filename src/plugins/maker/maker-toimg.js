import sharp from "sharp";

let handler = async (m, { conn, usedPrefix, command }) => {
  try {
    const q = m.quoted || m;
    const mime = (q.msg || q).mimetype || q.mediaType || "";

    if (!mime.includes("webp")) {
      return m.reply(
        `Reply a sticker with the command: ${usedPrefix + command}`
      );
    }

    await global.loading(m, conn);

    const buffer = await q.download?.();
    if (!Buffer.isBuffer(buffer)) {
      throw new Error("Invalid sticker buffer");
    }

    const output = await sharp(buffer)
      .resize(1024, 1024, { fit: "inside" })
      .png()
      .toBuffer();

    await conn.sendMessage(
      m.chat,
      { image: output, caption: "Sticker converted to image." },
      { quoted: m }
    );
  } catch (e) {
    global.logger.error(e);
    await m.reply("Failed to convert sticker.");
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["toimg"];
handler.tags = ["maker"];
handler.command = /^(toimg)$/i;

export default handler;