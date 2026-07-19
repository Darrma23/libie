/**
 * @file Context Optimizer
 * @module src/ai/optimizer
 */

/**
 * Saat ini optimizer belum digunakan.
 *
 * Nantinya optimizer akan:
 * - mengikuti dependency graph
 * - mengambil symbol yang benar-benar dipakai
 * - mengurangi ukuran context sebelum dikirim ke LLM
 *
 * @param {Array} context
 * @returns {Promise<Array>}
 */
export async function optimizeContext(context) {
    return context;
}

export default optimizeContext;