export const growth = Math.pow(Math.PI / Math.E, 1.618) * Math.E * 0.75

/**
 * Hitung range EXP untuk level tertentu
 * @param {number} level
 * @param {number} exp
 * @param {number} multiplier
 */
export function xpRange(level, exp = 0, multiplier = 1) {
    if (level < 0) throw new TypeError('level cannot be negative')

    level = Math.floor(level)

    const min =
        level === 0
            ? 0
            : Math.round(Math.pow(level, growth) * multiplier) + 1

    const max = Math.round(Math.pow(level + 1, growth) * multiplier)

    return {
        min,
        max,
        xp: max - min,
        progress: Math.max(0, exp - min)
    }
}

/**
 * Cari level berdasarkan total EXP
 * @param {number} exp
 * @param {number} multiplier
 */
export function findLevel(exp, multiplier = 1) {
    if (exp === Infinity) return Infinity
    if (isNaN(exp)) return NaN
    if (exp <= 0) return 0

    let level = 0
    while (true) {
        const { max } = xpRange(level, exp, multiplier)
        if (exp < max) return level
        level++
    }
}

/**
 * Cek apakah user bisa level up
 * @param {number} level
 * @param {number} exp
 * @param {number} multiplier
 */
export function canLevelUp(level, exp, multiplier = 1) {
    if (level < 0) return false
    if (exp === Infinity) return true
    if (isNaN(exp)) return false
    if (exp <= 0) return false

    return findLevel(exp, multiplier) > level
}