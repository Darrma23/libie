/**
 * @file Prompt Builder
 * @module src/ai/promptBuilder
 */

const SYSTEM_PROMPT = `
Kamu adalah AI yang memahami source code repository Libie.

Jawab pertanyaan HANYA berdasarkan source code yang diberikan.

Jika jawabannya tidak ada di source code, katakan dengan jujur bahwa informasinya tidak tersedia.
`.trim();

/**
 * Build prompt untuk AI repository assistant.
 *
 * @param {string} question
 * @param {string} context
 * @returns {string}
 */
export function buildPrompt(question, context) {
    if (!question) {
        throw new Error("Question is required.");
    }

    if (!context) {
        throw new Error("Context is required.");
    }

    return `
${SYSTEM_PROMPT}

==================== REPOSITORY CONTEXT ====================

${context}

======================== PERTANYAAN ========================

${question}

========================== JAWABAN ==========================
`.trim();
}

export default buildPrompt;