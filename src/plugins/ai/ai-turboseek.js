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
    ? result.similarQuestions.map((v, i) => `${i + 1}. ${v}`).join("\n")
    : "-"}`;

        await conn.sendMessage(
            m.chat,
            { text: msg },
            { quoted: m }
        );
    } catch (e) {
        console.error("[TURBOSEEK ERROR]", e?.response?.data || e.message);
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

/* ============================================================
 *  HELPER FUNCTIONS
 * ============================================================ */

/**
 * Bersihkan HTML jadi teks biasa
 */
function stripHtml(input) {
    if (!input) return "";
    return String(input)
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

/**
 * Ambil teks dari response API apa pun bentuknya
 * (string HTML, { answer }, { content }, { data }, { text }, dll)
 */
function extractText(raw) {
    if (raw == null) return "";
    if (typeof raw === "string") return stripHtml(raw);

    // Prioritas field yang umum dipakai
    const candidates = [
        raw.answer,
        raw.content,
        raw.text,
        raw.result,
        raw.message,
        raw.data?.answer,
        raw.data?.content,
        raw.data?.text,
        raw.data
    ];

    for (const c of candidates) {
        if (typeof c === "string" && c.trim()) return stripHtml(c);
        if (c && typeof c === "object") {
            const nested = extractText(c);
            if (nested) return nested;
        }
    }

    return "";
}

/**
 * Ambil array similar questions dari bentuk response apa pun
 */
function extractSimilar(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw
            .map((v) =>
                typeof v === "string"
                    ? v
                    : v?.question || v?.text || v?.title || ""
            )
            .filter(Boolean);
    }
    const candidates = [
        raw.questions,
        raw.similar,
        raw.similarQuestions,
        raw.data,
        raw.result
    ];
    for (const c of candidates) {
        if (Array.isArray(c) && c.length) {
            return extractSimilar(c);
        }
    }
    return [];
}

/**
 * Ambil daftar URL sumber dari bentuk response apa pun
 */
function extractSources(raw) {
    if (!raw) return [];
    const arr = Array.isArray(raw)
        ? raw
        : raw.sources || raw.data || raw.result || [];
    if (!Array.isArray(arr)) return [];
    return arr
        .map((s) => (typeof s === "string" ? s : s?.url || s?.link || ""))
        .filter(Boolean);
}

/* ============================================================
 *  MAIN TURBOSEEK FUNCTION
 * ============================================================ */

async function turboseek(question) {
    if (!question) throw new Error("Question is required.");

    const inst = axios.create({
        baseURL: "https://www.turboseek.io/api",
        timeout: 30000,
        headers: {
            origin: "https://www.turboseek.io",
            referer: "https://www.turboseek.io/",
            "content-type": "application/json",
            accept: "application/json, text/plain, */*",
            "user-agent":
                "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36"
        }
    });

    // 1) Sources
    let sourcesRaw;
    try {
        const r = await inst.post("/getSources", { question });
        sourcesRaw = r.data;
    } catch (e) {
        console.error("[TURBOSEEK] getSources gagal:", e?.response?.status, e.message);
        throw new Error(`getSources gagal: ${e?.response?.status || e.message}`);
    }

    const sourceList = extractSources(sourcesRaw);

    // 2) Similar Questions (tidak fatal kalau gagal)
    let similarQuestions = [];
    try {
        const r = await inst.post("/getSimilarQuestions", {
            question,
            sources: sourcesRaw
        });
        similarQuestions = extractSimilar(r.data);
    } catch (e) {
        console.error("[TURBOSEEK] getSimilarQuestions gagal:", e?.response?.status, e.message);
    }

    // 3) Answer
    let answerText = "";
    try {
        const r = await inst.post("/getAnswer", {
            question,
            sources: sourcesRaw
        });

        console.log("[TURBOSEEK] raw answer:", JSON.stringify(r.data).slice(0, 500));
        answerText = extractText(r.data);
    } catch (e) {
        console.error("[TURBOSEEK] getAnswer gagal:", e?.response?.status, e.message);
        throw new Error(`getAnswer gagal: ${e?.response?.status || e.message}`);
    }

    if (!answerText) {
        answerText = "⚠️ API tidak mengembalikan jawaban. Cek console untuk raw response.";
    }

    return {
        answer: answerText,
        sources: sourceList,
        similarQuestions
    };
}