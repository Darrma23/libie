import { uploader2 } from "#lib/uploader.js";

let handler = async (m, { conn, text }) => {
  const q = m.quoted ? m.quoted : m;
  const mime = (q.msg || q).mimetype || "";

  if (!mime.startsWith("image/")) {
    return m.reply("Send or reply image first!");
  }

  if (!text) {
    return m.reply("Input prompt!\n\nExample: .nanobanana to ghibli style art");
  }

  await global.loading(m, conn);

  try {
    const buff = await q.download();

    // FIX DI SINI — pilih uploader yang bener!
    const up = await uploader2(buff).catch(() => null);
    if (!up) return m.reply("Failed to upload image to server. Try again later.");
    
    const url =
      `https://api.nekolabs.web.id/image.gen/nano-banana` +
      `?prompt=${encodeURIComponent(text)}` +
      `&imageUrl=${encodeURIComponent(up)}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(response.statusText);

    const json = await response.json();
    if (!json.result) throw new Error("Response API not valid");

    await conn.sendMessage(
      m.chat,
      {
        image: { url: json.result },
        caption: `*Nano Kontext AI*\n\nPrompt: ${text}`
      },
      { quoted: m }
    );
  } catch (e) {
    console.error("Error:", e);
    m.reply("Error: " + e.message);
  }

  await global.loading(m, conn, true);
};

handler.help = ["nanobanana"];
handler.tags = ["ai"];
handler.command = ["nanobanana", "nano", "nb"];

handler.desc = [
  "Mengubah gambar menggunakan Nano Banana AI",
  "Mendukung transformasi gambar berbasis prompt teks",
  "Cocok untuk gaya ilustrasi seperti anime atau Ghibli",
  "Mengharuskan input gambar dan prompt",
  "Mengunggah gambar ke server sebelum diproses AI",
  "Menampilkan hasil gambar AI secara langsung"
];

export default handler;handler;