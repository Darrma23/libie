/**
 * @file TurboSeek AI search command handler
 * @module plugins/ai/turboseek
 * @license Apache-2.0
 * @author Himejima
 */

import axios from "axios";

let handler = async (m, { conn, text }) => {
    if (!text) return m.reply("Ask something to TurboSeek AI");

    try {
        await global.loading(m, conn);

        const result = await turboseek(text);

        const msg = `🧠 *TurboSeek Result*

❓ *Question:*
${text}

📌 *Answer:*
${result.answer}

🔗 *Sources:*
${result.sources.length
    ? result.sources.map((v, i) => `${i + 1}. ${v}`).join("\n")
    : "-"}

✨ *Similar Questions:*
${result.similarQuestions?.length
    ? result.similarQuestions.join("\n")
    : "-"}`;

        await conn.sendMessage(
            m.chat,
            { text: msg },
            { quoted: m }
        );
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

/**
 * Command metadata
 */
handler.help = ["tseek"];
handler.tags = ["ai"];
handler.command = /^(tseek|turboseek)$/i;

handler.desc = [
    "Mencari jawaban menggunakan TurboSeek AI",
    "Menganalisis pertanyaan dengan referensi web",
    "Menampilkan jawaban beserta sumber",
    "Memberikan rekomendasi pertanyaan serupa",
    "Cocok untuk riset dan pencarian informasi"
];

export default handler;

async function turboseek(question) {
    if (!question) throw new Error("Question is required.");

    const inst = axios.create({
        baseURL: "https://www.turboseek.io/api",
        headers: {
            origin: "https://www.turboseek.io",
            referer: "https://www.turboseek.io/",
            "user-agent":
                "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36"
        }
    });

    const { data: sources } = await inst.post("/getSources", {
        question
    });

    const { data: similarQuestions } = await inst.post("/getSimilarQuestions", {
        question,
        sources
    });

    const { data: answer } = await inst.post("/getAnswer", {
        question,
        sources
    });

    const cleanAnswer =
        answer
            .match(/<p>(.*?)<\/p>/gs)
            ?.map((match) =>
                match
                    .replace(/<\/?p>/g, "")
                    .replace(/<\/?strong>/g, "")
                    .replace(/<\/?em>/g, "")
                    .replace(/<\/?b>/g, "")
                    .replace(/<\/?i>/g, "")
                    .replace(/<\/?u>/g, "")
                    .replace(/<\/?[^>]+(>|$)/g, "")
                    .trim()
            )
            .join("\n\n") ||
        answer.replace(/<\/?[^>]+(>|$)/g, "").trim();

    return {
        answer: cleanAnswer,
        sources: sources.map((s) => s.url),
        similarQuestions
    };
}