// src/lib/payment.js
import { createTransaction, checkTransaction, generateQR } from './pakasir.js'

const PRICES = {
    limit: {
        '10': 5000,
        '25': 10000,
        '50': 15000,
        '100': 25000
    },
    rent: {
        '7': 15000,   // 7 hari
        '30': 50000,  // 30 hari
        '90': 120000  // 90 hari
    },
    jadibot: {
        '7': 20000,
        '30': 70000,
        '90': 150000
    }
}

/**
 * Buat order pembayaran
 */
export async function createPayment(jid, type, duration, amount = null) {
    let orderId, totalPrice, itemName, metadata
    
    switch(type) {
        case 'limit':
            const limitAmount = parseInt(duration)
            totalPrice = PRICES.limit[duration]
            if (!totalPrice) throw new Error('Limit tidak valid. Pilih: 10, 25, 50, 100')
            itemName = `Limit ${limitAmount}`
            metadata = {
                type: 'limit',
                limit_amount: limitAmount,
                duration: 1 // langsung ditambahkan
            }
            break
            
        case 'rent':
            const days = parseInt(duration)
            totalPrice = PRICES.rent[duration]
            if (!totalPrice) throw new Error('Durasi tidak valid. Pilih: 7, 30, 90')
            itemName = `Rent Group ${days} Hari`
            metadata = {
                type: 'rent',
                days: days,
                expired_at: Math.floor(Date.now() / 1000) + (days * 86400)
            }
            break
            
        case 'jadibot':
            const jdDays = parseInt(duration)
            totalPrice = PRICES.jadibot[duration]
            if (!totalPrice) throw new Error('Durasi tidak valid. Pilih: 7, 30, 90')
            itemName = `Jadibot ${jdDays} Hari`
            metadata = {
                type: 'jadibot',
                days: jdDays,
                expired_at: Math.floor(Date.now() / 1000) + (jdDays * 86400)
            }
            break
            
        default:
            throw new Error('Tipe pembayaran tidak valid')
    }
    
    // Create transaction di Pakasir
    orderId = `${type.toUpperCase()}_${jid.slice(0, 8)}_${Date.now()}`
    const payment = await createTransaction(orderId, totalPrice)
    
    // Simpan ke database orders
    const orderData = {
        id: orderId,
        user_id: jid,
        item: itemName,
        quantity: 1,
        total_price: totalPrice,
        status: 'pending',
        payment_id: payment.id || orderId,
        target_id: jid,
        metadata: JSON.stringify({
            ...metadata,
            qr_string: payment.qr_string,
            method: 'qris',
            created_at: Date.now()
        }),
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000)
    }
    
    // Insert ke tabel orders
    if (!global.rpg) throw new Error('Database tidak terinisialisasi')
    global.rpg.data.orders[orderId] = orderData
    
    // Generate QR
    const qrBuffer = await generateQR(payment.qr_string)
    const qrBase64 = `data:image/png;base64,${qrBuffer.toString('base64')}`
    
    return {
        order_id: orderId,
        type: type,
        item: itemName,
        total_price: totalPrice,
        qr_base64: qrBase64,
        qr_string: payment.qr_string,
        expired_at: Math.floor((Date.now() + 5 * 60 * 1000) / 1000)
    }
}

/**
 * Proses pembayaran setelah sukses
 */
export async function processPayment(orderId) {
    const order = global.rpg.data.orders[orderId]
    if (!order) throw new Error('Order tidak ditemukan')
    
    // Cek ke Pakasir
    const transaction = await checkTransaction(orderId, order.total_price)
    
    // Update status
    order.status = transaction.status || order.status
    order.updated_at = Math.floor(Date.now() / 1000)
    
    if (transaction.status === 'PAID' || transaction.status === 'paid') {
        const metadata = JSON.parse(order.metadata || '{}')
        const user = global.rpg.data.user[order.user_id]
        
        if (!user) throw new Error('User tidak ditemukan')
        
        switch(metadata.type) {
            case 'limit':
                // Tambah limit
                user.user_limit = (user.user_limit || 0) + metadata.limit_amount
                break
                
            case 'rent':
                // Update rent di tabel rent
                const rent = global.rpg.data.rent[order.user_id]
                if (!rent) {
                    // Buat baru
                    global.rpg.data.rent[order.user_id] = {
                        jid: order.user_id,
                        expired: metadata.expired_at,
                        created_at: Math.floor(Date.now() / 1000),
                        updated_at: Math.floor(Date.now() / 1000)
                    }
                } else {
                    // Extend rent
                    const currentExpired = rent.expired || 0
                    const newExpired = Math.max(currentExpired, Math.floor(Date.now() / 1000)) + (metadata.days * 86400)
                    rent.expired = newExpired
                    rent.updated_at = Math.floor(Date.now() / 1000)
                }
                break
                
            case 'jadibot':
                // Update jadibot di tabel jadibot
                const jadibot = global.rpg.data.jadibot[order.user_id]
                if (!jadibot) {
                    global.rpg.data.jadibot[order.user_id] = {
                        jid: order.user_id,
                        expired: metadata.expired_at,
                        created_at: Math.floor(Date.now() / 1000),
                        updated_at: Math.floor(Date.now() / 1000)
                    }
                } else {
                    const currentExpired = jadibot.expired || 0
                    const newExpired = Math.max(currentExpired, Math.floor(Date.now() / 1000)) + (metadata.days * 86400)
                    jadibot.expired = newExpired
                    jadibot.updated_at = Math.floor(Date.now() / 1000)
                }
                break
        }
        
        // Log
        console.log(`✅ Payment processed: ${orderId} - ${order.user_id} - ${metadata.type}`)
        
        return {
            success: true,
            type: metadata.type,
            user_id: order.user_id
        }
    }
    
    return {
        success: false,
        status: order.status
    }
}

/**
 * Format rupiah
 */
export function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount)
}