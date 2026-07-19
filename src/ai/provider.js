/**
 * @file AI Provider
 * @module src/ai/provider
 */

const provider = {
    /**
     * Microsoft Copilot
     * @param {string} prompt
     * @returns {Promise<string>}
     */
    async copilot(prompt) {
        const url = `https://api.yupra.my.id/api/ai/copilot-think?text=${encodeURIComponent(prompt)}`;

        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Libie Bot)"
            }
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();

        if (!json?.status) {
            throw new Error(json?.message || "Provider Error");
        }

        return json.result?.trim() || "";
    },

    /**
     * OpenAI
     */
    async openai(prompt) {
        throw new Error("OpenAI provider belum dibuat.");
    },

    /**
     * Gemini
     */
    async gemini(prompt) {
        throw new Error("Gemini provider belum dibuat.");
    },

    /**
     * DeepSeek
     */
    async deepseek(prompt) {
        throw new Error("DeepSeek provider belum dibuat.");
    }
};

/**
 * Generate AI response.
 *
 * @param {string} name
 * @param {string} prompt
 * @returns {Promise<string>}
 */
export async function generate(name, prompt) {
    const fn = provider[name];

    if (!fn) {
        throw new Error(`Unknown provider: ${name}`);
    }

    return await fn(prompt);
}

export default provider;