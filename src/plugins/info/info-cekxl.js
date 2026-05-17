let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text) {
      return m.reply(
        `Masukin nomor XL.\nContoh:\n${usedPrefix + command} 081933732553`
      );
    }

    await global.loading(m, conn);

    // Bersihin nomor
    let number = text.replace(/\D/g, "");

    // Format ke 62
    if (number.startsWith("0")) {
      number = "62" + number.slice(1);
    }

    if (!/^62\d{8,15}$/.test(number)) {
      throw new Error("Format nomor tidak valid");
    }

    const url = `https://libieapiofficial.dpdns.org/api/info/cekxl?number=${number}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();

    if (!json?.status || !json?.result) {
      throw new Error("Data tidak ditemukan");
    }

    const data = json.result;

    let caption = `
📱 *CEK XL*

• Nomor      : ${data.number || "-"}
• Operator   : ${data.operator || "-"}
• Verified   : ${data.id_verified || "-"}
• Jaringan   : ${data.network || "-"}
• Masa Aktif : ${data.exp_date || "-"}
• Grace      : ${data.grace_until || "-"}
• Umur Kartu : ${data.tenure || "-"}

📡 *VoLTE*
• Device : ${data.volte?.device ? "✅" : "❌"}
• Area   : ${data.volte?.area ? "✅" : "❌"}
• SIM    : ${data.volte?.simcard ? "✅" : "❌"}
`.trim();

    if (Array.isArray(data.packages) && data.packages.length) {
      caption += `\n\n📦 *PAKET AKTIF*`;

      for (const pkg of data.packages) {
        caption += `\n\n▣ *${pkg.name || "-"}*`;
        caption += `\n• Expired : ${pkg.expiry || "-"}`;

        if (Array.isArray(pkg.quotas) && pkg.quotas.length) {
          caption += `\n\n📊 Kuota:`;

          for (const q of pkg.quotas) {
            caption += `
• ${q.name || "-"}
  Sisa : ${q.remaining || "0KB"} / ${q.total || "0KB"}
  Usage: ${q.percent ?? 0}%`;
          }
        }
      }
    } else {
      caption += `\n\nTidak ada paket aktif.`;
    }

    await conn.reply(m.chat, caption.trim(), m);

  } catch (e) {
    console.error(e);
    global.logger?.error?.(e);

    m.reply(
      `❌ Error: ${e.message || "Terjadi kesalahan"}`
    );
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["cekxl"];
handler.tags = ["info"];
handler.command = /^(cekxl)$/i;

export default handler;