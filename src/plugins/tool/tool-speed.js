import {
    exec as execCb
} from "child_process";
import {
    promisify
} from "util";

const exec = promisify(execCb);

const handler = async (m, { conn }) => {
    await m.reply("Testing Speed...");
    let o;
    try {
        o = await exec("python3 speed.py --share");
    } catch (e) {
        o = e;
    }

    const stdout = o?.stdout?.trim();
    const stderr = o?.stderr?.trim();

    /*
     * cari image URL dari output
     */
    const mat = stdout?.match(
        /Share results: (http[^\s]+)/
    );
    const imgUrl = mat?.[1];

    const caption =
        stdout ||
        stderr ||
        "Tidak ada output";

    /*
     * kirim image kalo ada, text kalo ga ada
     */
    if (imgUrl) {
        try {
            await conn.sendMessage(
                m.chat,
                {
                    image: {
                        url: imgUrl
                    },
                    caption
                },
                { quoted: m }
            );
            return;
        } catch {}
    }

    await conn.sendMessage(
        m.chat,
        { text: caption },
        { quoted: m }
    );
};

handler.command = ["speed", "speedtest"];
handler.help = ["speed", "speedtest"];
handler.tags = ["info"];

export default handler;
