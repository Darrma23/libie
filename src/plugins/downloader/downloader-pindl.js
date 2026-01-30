const handler = async (m, { conn, text }) => {
  try {
    await global.loading(m, conn);

    if (!text) return m.reply("Example:\n.pindl https://pin.it/xxxx");

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20000);

    const res = await fetch("https://labs.shannzx.xyz/api/v1/pinterest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: text }),
      signal: controller.signal
    });

    if (!res.ok) {
      if (res.status === 500) {
        return m.reply("The API server is currently unavailable. Please try another link.");
      }
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();

    if (!json.status || !json.data?.medias?.length) {
      return m.reply("No Pinterest media found.");
    }

    const media = json.data.medias.at(-1);
    if (!media?.url) return m.reply("Media data is empty.");

    const fileRes = await fetch(media.url);
    if (!fileRes.ok) throw new Error("Failed to download media");

    const buffer = Buffer.from(await fileRes.arrayBuffer());
    const isVideo = media.type === "video" || /\.mp4|\.webm/i.test(media.url);

    await conn.sendMessage(
      m.chat,
      isVideo
        ? {
            video: buffer,
          }
        : {
            image: buffer,
          },
      { quoted: m }
    );

    await global.loading(m, conn, true);
  } catch (e) {
    console.error(e);
    m.reply("Downloader error. The API or Pinterest may be temporarily unavailable.");
  }
};

handler.help = ["pindl"];
handler.tags = ["downloader"];
handler.command = /^pindl$/i;

export default handler;