import { spawn } from "child_process";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

async function toMp3(buffer) {
    const input = join(tmpdir(), `${Date.now()}_input`);
    const output = join(tmpdir(), `${Date.now()}_output.mp3`);

    await writeFile(input, buffer);

    await new Promise((resolve, reject) => {
        const ffmpeg = spawn("ffmpeg", [
            "-y",
            "-i", input,
            "-vn",
            "-acodec", "libmp3lame",
            "-ab", "128k",
            output,
        ]);

        ffmpeg.on("error", reject);
        ffmpeg.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error("ffmpeg conversion failed"));
        });
    });

    const result = await readFile(output);

    // bersih-bersih, jangan ninggal sampah
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
        if (!Buffer.isBuffer(buffer))
            return m.reply("Gagal ambil media. Entah kenapa.");

        const audio = await toMp3(buffer);

        await conn.sendMessage(
            m.chat,
            {
                audio,
                mimetype: "audio/mpeg",
                fileName: "audio.mp3",
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

handler.help = ["tomp3", "toaudio"];
handler.tags = ["tools"];
handler.command = /^(tomp3|toaudio)$/i;

export default handler;