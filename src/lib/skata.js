import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// kbbi.json satu folder dengan skata.js
const kbbi = JSON.parse(
    readFileSync(join(__dirname, 'kbbi.json'), 'utf-8')
)

function random(list) {
    return list[Math.floor(Math.random() * list.length)]
}

function kata() {
    const huruf = random([
        'a','b','c','d','e','g','h','i','j',
        'k','l','m','n','p','r','s','t','u','w'
    ])

    const res = kbbi.filter(v => v.startsWith(huruf))
    return {
        status: true,
        kata: random(res)
    }
}

function cKata(input = '') {
    return {
        creator: '@neoxrs – Recoded by Clicknetcafe',
        status: kbbi.includes(input.toLowerCase())
    }
}

export default { kata, cKata }