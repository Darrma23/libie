import { spawn } from "child_process";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

async function toPTT(buffer) {
    const input = join(tmpdir(), `${Date.now()}_input`);
    const output = join(tmpdir(), `${Date.now()}_output.ogg`);

    await writeFile(input, buffer);

    await new Promise((resolve, reject) => {
        const ffmpeg = spawn("ffmpeg", [
            "-y",
            "-i", input,
            "-vn",
            "-map", "a:0",
            "-ac", "1",
            "-ar", "48000",
            "-b:a", "64k",
            "-c:a", "libopus",
            output,
        ]);

        ffmpeg.on("error", reject);
        ffmpeg.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error("ffmpeg opus conversion failed"));
        });
    });

    const result = await readFile(output);

    await unlink(input);
    await unlink(output);

    return result;
}

let handler = async (m, { conn, usedPrefix, command }) => {
    try {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || q.mediaType || "";

        if (!mime || !/^(video|audio)\//.test(mime))
            return m.reply(
                `Reply video / audio dengan:\n› ${usedPrefix + command}`
            );

        await global.loading(m, conn);

        const buffer = await q.download?.();
        if (!Buffer.isBuffer(buffer) || buffer.length === 0)
            return m.reply("Media kosong. Ini bukan sihir.");

        const audio = await toPTT(buffer);

        await conn.sendMessage(
            m.chat,
            {
                audio,
                mimetype: "audio/ogg; codecs=opus",
                ptt: true,
            },
            { quoted: m }
        );
    } catch (e) {
        global.logger?.error?.(e);
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

handler.help = ["toptt", "tovn"];
handler.tags = ["tools"];
handler.command = /^(toptt|tovn)$/i;

export default handler;