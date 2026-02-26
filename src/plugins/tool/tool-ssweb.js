let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text)
    return m.reply(`URL mana?\nContoh:\n${usedPrefix + command} https://google.com`);

  if (!/^https?:\/\//.test(text))
    return m.reply("Masukin URL yang valid (http/https)");

  await global.loading(m, conn);

  try {
    const imageUrl = `https://image.thum.io/get/fullpage/${text}`;

    const res = await fetch(imageUrl);

    if (!res.ok)
      throw new Error(`ThumIO HTTP ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());

    await conn.sendMessage(
      m.chat,
      {
        image: buffer,
        caption: `Screenshot Fullpage\n🔗 ${text}`,
      },
      { quoted: m }
    );
  } catch (e) {
    global.logger.error(e);

    m.reply(`Error screenshot:\n${e.message}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["ssweb"];
handler.tags = ["tools"];
handler.command = /^ssweb$/i;

export default handler;