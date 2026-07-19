let handler = async (m, { conn, text, usedPrefix, command }) => {
    try {
        if (!text) {
            return m.reply(
                `Masukkan nomor XL.\nContoh:\n${usedPrefix + command} 081933732553`
            );
        }

        await global.loading(m, conn);

        let number = text.replace(/\D/g, "");

        if (number.startsWith("62")) {
            number = "0" + number.slice(2);
        }

        if (!/^0?8\d{8,13}$/.test(number)) {
            throw new Error("Format nomor tidak valid");
        }

        // Ambil homepage
        const home = await fetch("https://xl-ku.my.id/", {
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        const html = await home.text();

        // Ambil token
        const token = html.match(
            /var\s+f38767c3468d1286d\s*=\s*"([^"]+)"/
        )?.[1];

        if (!token) {
            throw new Error("Token API tidak ditemukan");
        }

        // Request data
        const res = await fetch(
            `https://xl-ku.my.id/check/all-info/${number}`,
            {
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0",
                    "Referer": "https://xl-ku.my.id/",
                    "Origin": "https://xl-ku.my.id",
                    "X-Requested-With": "XMLHttpRequest",
                    "xl-05a423b16d": token
                }
            }
        );

        const json = await res.json();

        console.log(json);

        if (!json.success) {
            throw new Error(json.message || "Request gagal");
        }

        const data = json.data;

        let caption = `
📱 *CEK XL*

• Nomor      : ${number}
• Operator   : ${data.subs_info.operator}
• Verified   : ${data.subs_info.id_verified}
• Jaringan   : ${data.subs_info.net_type}
• Masa Aktif : ${data.subs_info.exp_date}
• Grace      : ${data.subs_info.grace_until}
• Umur Kartu : ${data.subs_info.tenure}

📡 *VoLTE*
• Device : ${data.subs_info.volte.device ? "✅" : "❌"}
• Area   : ${data.subs_info.volte.area ? "✅" : "❌"}
• SIM    : ${data.subs_info.volte.simcard ? "✅" : "❌"}
`;

        if (data.package_info?.packages?.length) {
            caption += "\n\n📦 *PAKET AKTIF*";

            for (const pkg of data.package_info.packages) {
                caption += `

▣ *${pkg.name}*
• Expired : ${pkg.expiry}`;

                for (const q of pkg.quotas) {
                    caption += `
• ${q.name}
  ${q.remaining} / ${q.total}
  ${q.percent}%`;
                }
            }
        } else {
            caption += "\n\nTidak ada paket aktif.";
        }

        await conn.reply(m.chat, caption.trim(), m);

    } catch (e) {
        console.error(e);
        m.reply(`❌ ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["cekxl"];
handler.tags = ["info"];
handler.command = /^cekxl$/i;

export default handler;