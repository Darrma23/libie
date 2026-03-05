import { uploader } from "#lib/uploader.js";

let handler = async (m, { conn }) => {
	try {
		const q = m.quoted ?? m;
		const mime = (q.msg || q).mimetype || "";

		if (!mime || !/audio|video/.test(mime)) {
			return m.reply("Reply audio / video");
		}

		await global.loading(m, conn);

		// download media
		const buffer = await q.download();
		if (!Buffer.isBuffer(buffer) || buffer.length < 1000) {
			throw new Error("Failed to download valid media buffer");
		}

		// upload media → URL
		const up = await uploader(buffer);

		let mediaUrl;
		if (typeof up === "string") {
			mediaUrl = up;
		} else if (typeof up === "object") {
			mediaUrl =
				up.url ||
				up.result ||
				up.link ||
				up.data?.url ||
				up.data?.result;
		}

		if (!mediaUrl || typeof mediaUrl !== "string") {
			throw new Error("Uploader returned invalid URL structure");
		}

		mediaUrl = mediaUrl.trim();

		if (!/^https?:\/\//i.test(mediaUrl)) {
			throw new Error("Invalid uploader URL: " + mediaUrl);
		}

		// hit API Libie
		const res = await fetch(
			`https://libieapiofficial.dpdns.org/api/tools/whatsmusic?url=${encodeURIComponent(mediaUrl)}`
		);

		const json = await res.json();

		if (!json.status) {
			throw new Error(json.message || "Music not found");
		}

		const data = json.data;

		const txt = `
*RESULT FOUND*

*• Title:* ${data.title || "-"}
*• Artist:* ${
			Array.isArray(data.artists)
				? data.artists.join(", ")
				: "-"
		}
*• Album:* ${data.album || "-"}
*• Genres:* ${
			Array.isArray(data.genres) && data.genres.length
				? data.genres.join(", ")
				: "-"
		}
*• Duration:* ${data.duration || "-"}
*• Release Date:* ${data.release_date || "-"}
		`.trim();

		await m.reply(txt);

	} catch (e) {
		conn.logger.error(e);
		m.reply(`Error: ${e.message}`);
	} finally {
		await global.loading(m, conn, true);
	}
};

handler.help = ["whatsmusic"];
handler.tags = ["tools"];
handler.command = /^(whatsmusic)$/i;

export default handler;