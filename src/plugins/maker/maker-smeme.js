/**
 * @file Sticker meme generator command handler
 * @module plugins/maker/smeme
 * @license Apache-2.0
 */

import { sticker } from "#lib/sticker.js";
import { uploader } from "#lib/uploader.js";

let handler = async (m, { conn, args, usedPrefix, command }) => {
    try {
        const q = m.quoted ?? m;
        const mime = (q.msg || q).mimetype || "";

        if (!mime || !/image\/(jpeg|png|webp)/.test(mime)) {
            return m.reply("Need JPEG / PNG / WEBP image");
        }

        const [top = "", bottom = ""] = args.join(" ").split("|");
        if (!top && !bottom) {
            return m.reply(`Need text\nEx: ${usedPrefix + command} top|bottom`);
        }

        await global.loading(m, conn);

        // download image
        const img = await q.download();
        if (!Buffer.isBuffer(img) || img.length < 1000) {
            throw new Error("Failed to download valid image buffer");
        }

        // upload image
        
        const up = await uploader(img);

		let imageUrl;
		
		if (typeof up === "string") {
		    imageUrl = up;
		} else if (typeof up === "object") {
		    imageUrl =
		        up.url ||
		        up.result ||
		        up.link ||
		        up.data?.url ||
		        up.data?.result;
		}
		
		if (!imageUrl || typeof imageUrl !== "string") {
		    throw new Error("Uploader returned invalid URL structure");
		}
		
		imageUrl = imageUrl.trim();
		
		if (!/^https?:\/\//i.test(imageUrl)) {
		    throw new Error("Invalid uploader URL: " + imageUrl);
		}
        
        // build API url
        const apiUrl =
            `https://libieapiofficial.dpdns.org/api/maker/smeme` +
            `?imageUrl=${encodeURIComponent(imageUrl)}` +
            `&topText=${encodeURIComponent(top)}` +
            `&bottomText=${encodeURIComponent(bottom)}`;

        // request to API
        const res = await fetch(apiUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "image/png,image/*;q=0.9,*/*;q=0.8",
            },
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`API ${res.status}: ${text}`);
        }

        const buf = Buffer.from(await res.arrayBuffer());
        if (!buf || buf.length < 1000) {
            throw new Error("Invalid image buffer from API");
        }

        // convert to sticker
        const stc = await sticker(buf, {
            packName: global.config.stickpack || "",
            authorName: global.config.stickauth || "",
        });

        await conn.sendMessage(
            m.chat,
            { sticker: stc },
            { quoted: m }
        );

    } catch (e) {
        conn.logger.error(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["smeme"];
handler.tags = ["maker"];
handler.command = /^(smeme)$/i;

export default handler;