/**
 * @file AI Engine
 * @module src/ai/engine
 */

import { buildContext } from "./contextBuilder.js";
import { formatContext } from "./formatter.js";
import { buildPrompt } from "./promptBuilder.js";
import { generate as generateAI } from "./provider.js";

/**
 * Generate AI response.
 *
 * @param {Object} options
 * @param {string} [options.provider="copilot"]
 * @param {"public"|"local"} [options.mode="public"]
 * @param {string} options.question
 * @returns {Promise<string>}
 */
export async function generate({
    provider = "copilot",
    mode = "public",
    question
}) {
    if (!question?.trim()) {
        throw new Error("Question is required.");
    }

    // ==========================
    // PUBLIC MODE
    // ==========================
    if (mode === "public") {
        console.log("[AI] Mode : PUBLIC");
        console.log("[AI] Question :", question);

        return await generateAI(provider, question);
    }

    // ==========================
    // LOCAL MODE
    // ==========================
    console.log("[AI] Mode : LOCAL");
    console.log("[AI] Question :", question);

    const context = await buildContext(question);

    console.log("[AI] Context Files :", context.length);

    if (!context.length) {
        console.warn("[AI] Context not found, fallback to public.");

        return await generateAI(provider, question);
    }

    for (const file of context) {
        console.log("[AI] >", file.file);
    }

    const formatted = formatContext(context);

    console.log("[AI] Context Size :", formatted.length, "chars");

    const prompt = buildPrompt(question, formatted);

    console.log("========== AI PROMPT ==========");
    console.log(prompt);
    console.log("========== END PROMPT =========");

    try {
        const result = await generateAI(provider, prompt);

        console.log("[AI] Success");

        return result;

    } catch (err) {
        console.error("[AI] Provider Error");
        console.error(err);

        throw err;
    }
}

export default {
    generate
};