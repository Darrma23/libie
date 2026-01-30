const EXP_FREE = 10000
const EXP_PREM = 20000
const LIMIT_FREE = 10
const LIMIT_PREM = 20
const MONEY_FREE = 10000
const MONEY_PREM = 20000

const WEEK = 604800000 // 7 hari

let handler = async (m, { conn, isPrems }) => {
  let user = global.rpg.data.user[m.sender]

  // init biar ga error
  if (typeof user.lastweekly !== 'number') user.lastweekly = 0
  if (typeof user.user_limit !== 'number') user.user_limit = 0

  let now = Date.now()
  let nextClaim = user.lastweekly + WEEK

  // COOLDOWN
  if (now < nextClaim) {
    return m.reply(
      `Kamu sudah klaim weekly.\n` +
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
  user.lastweekly = now

  conn.reply(
    m.chat,
    `🎁 *WEEKLY REWARD*\n\n` +
    `+${exp} Exp\n` +
    `+${money} Money\n` +
    `+${limit} Limit`,
    m
  )
}

handler.help = ['weekly']
handler.tags = ['rpg']
handler.command = /^(weekly)$/i

export default handler

function msToTime(ms) {
  let d = Math.floor(ms / (1000 * 60 * 60 * 24))
  let h = Math.floor(ms / (1000 * 60 * 60)) % 24
  let m = Math.floor(ms / (1000 * 60)) % 60

  return `${d} hari ${h} jam ${m} menit`
}