const EXP_FREE = 20000
const EXP_PREM = 40000
const LIMIT_FREE = 20
const LIMIT_PREM = 40
const MONEY_FREE = 20000
const MONEY_PREM = 40000

const MONTH = 2592000000 // 30 hari

let handler = async (m, { conn, isPrems }) => {
  let user = global.rpg.data.user[m.sender]

  // init biar ga error
  if (typeof user.lastmonthly !== 'number') user.lastmonthly = 0
  if (typeof user.user_limit !== 'number') user.user_limit = 0

  let now = Date.now()
  let nextClaim = user.lastmonthly + MONTH

  // COOLDOWN
  if (now < nextClaim) {
    return m.reply(
      `Kamu sudah klaim monthly.\n` +
      `Tunggu ${msToTime(nextClaim - now)} lagi`
    )
  }

  // REWARD
  let exp = isPrems ? EXP_PREM : EXP_FREE
  let money = isPrems ? MONEY_PREM : MONEY_FREE
  let limit = isPrems ? LIMIT_PREM : LIMIT_FREE

  user.exp += exp
  user.money += money
  user.user_limit += limit
  user.lastmonthly = now

  conn.reply(
    m.chat,
    `🎁 *MONTHLY REWARD*\n\n` +
    `+${exp} Exp\n` +
    `+${money} Money\n` +
    `+${limit} Limit`,
    m
  )
}

handler.help = ['monthly']
handler.tags = ['rpg']
handler.command = /^(monthly)$/i

export default handler

function msToTime(ms) {
  let d = Math.floor(ms / (1000 * 60 * 60 * 24))
  let h = Math.floor(ms / (1000 * 60 * 60)) % 24
  let m = Math.floor(ms / (1000 * 60)) % 60

  return `${d} hari ${h} jam ${m} menit`
}