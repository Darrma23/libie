// src/plugins/bayar.js
import { createTransaction, checkTransaction, cancelTransaction, generateQR } from '#lib/pakasir.js';

// Harga produk
const PRICES = {
  limit: {
    '10': 5000,
    '25': 10000,
    '50': 15000,
    '100': 25000
  },
  rent: {
    '7': 15000,
    '30': 50000,
    '90': 120000
  },
  jadibot: {
    '7': 20000,
    '30': 70000,
    '90': 150000
  }
};

// Cache transaksi aktif
const activeTransactions = new Map();

let handler = async (m, { conn, usedPrefix, command, args }) => {
  try {
    const jid = m.sender;
    const subCommand = args[0]?.toLowerCase();
    
    // ============================================
    // 1. CEK STATUS ORDER
    // ============================================
    if (subCommand === 'cek' || subCommand === 'check') {
      const orderId = args[1];
      if (!orderId) {
        return m.reply(
          `❌ Masukkan Order ID!\n\n` +
          `Contoh: ${usedPrefix + command} cek ORD_xxx`
        );
      }
      return await checkOrder(m, orderId, usedPrefix, command);
    }
    
    // ============================================
    // 2. VALIDASI COMMAND
    // ============================================
    if (!subCommand || !['limit', 'rent', 'jadibot'].includes(subCommand)) {
      return m.reply(
        `📋 *Cara Penggunaan ${usedPrefix + command}*\n\n` +
        `1️⃣ *Beli Limit*\n` +
        `${usedPrefix + command} limit 10|25|50|100\n` +
        `💰 Harga: Rp 5.000 - Rp 25.000\n\n` +
        
        `2️⃣ *Rent Group*\n` +
        `${usedPrefix + command} rent 7|30|90\n` +
        `💰 Harga: Rp 15.000 - Rp 120.000\n\n` +
        
        `3️⃣ *Jadibot*\n` +
        `${usedPrefix + command} jadibot 7|30|90\n` +
        `💰 Harga: Rp 20.000 - Rp 150.000\n\n` +
        
        `4️⃣ *Cek Status*\n` +
        `${usedPrefix + command} cek [ORDER_ID]\n\n` +
        
        `📌 *Contoh:*\n` +
        `${usedPrefix + command} limit 50`
      );
    }
    
    // ============================================
    // 3. VALIDASI DURASI
    // ============================================
    const duration = args[1];
    if (!duration) {
      return m.reply(
        `❌ Masukkan durasi!\n\n` +
        `Contoh: ${usedPrefix + command} ${subCommand} 10`
      );
    }
    
    const validDurations = {
      limit: ['10', '25', '50', '100'],
      rent: ['7', '30', '90'],
      jadibot: ['7', '30', '90']
    };
    
    if (!validDurations[subCommand].includes(duration)) {
      return m.reply(
        `❌ Durasi tidak valid!\n\n` +
        `Pilihan: ${validDurations[subCommand].join(', ')}`
      );
    }
    
    // ============================================
    // 4. LOADING
    // ============================================
    await global.loading(m, conn);
    
    // ============================================
    // 5. CEK APAKAH USER SEDANG TRANSAKSI AKTIF
    // ============================================
    const userActiveTx = Array.from(activeTransactions.values()).find(
      tx => tx.jid === jid && tx.status === 'pending'
    );
    
    if (userActiveTx) {
      const remaining = Math.ceil((userActiveTx.expired_at - Date.now()) / 60000);
      return m.reply(
        `⚠️ *Kamu masih punya transaksi aktif!*\n\n` +
        `🆔 Order: ${userActiveTx.order_id}\n` +
        `⏰ Sisa waktu: ${remaining} menit\n\n` +
        `Gunakan ${usedPrefix + command} cek ${userActiveTx.order_id} untuk cek status`
      );
    }
    
    // ============================================
    // 6. CEK RENT/JADIBOT AKTIF (KONFIRMASI)
    // ============================================
    if (subCommand === 'rent' || subCommand === 'jadibot') {
      const table = subCommand === 'rent' ? 'rent' : 'jadibot';
      const existing = global.rpg.data[table]?.[jid];
      
      if (existing && existing.expired > Math.floor(Date.now() / 1000)) {
        const remaining = Math.floor((existing.expired - Math.floor(Date.now() / 1000)) / 86400);
        const confirmMsg = 
          `⚠️ *Perhatian!*\n\n` +
          `Kamu sudah memiliki ${subCommand === 'rent' ? 'Rent Group' : 'Jadibot'} aktif.\n` +
          `📅 Sisa waktu: ${remaining} hari lagi.\n\n` +
          `Jika lanjut, masa aktif akan *diperpanjang* dari tanggal sekarang.\n` +
          `Yakin ingin lanjut? Ketik *ya* untuk konfirmasi.`;
        
        await m.reply(confirmMsg);
        
        // Tunggu konfirmasi 30 detik
        const confirmation = await waitForConfirmation(m, conn);
        if (!confirmation) {
          return m.reply('❌ Pembayaran dibatalkan.');
        }
      }
    }
    
    // ============================================
    // 7. BUAT TRANSAKSI
    // ============================================
    const totalPrice = PRICES[subCommand][duration];
    const shortJid = jid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
    const orderId = `${subCommand.toUpperCase()}_${shortJid}_${Date.now()}`;
    
    // Panggil API Pakasir
    const payment = await createTransaction(orderId, totalPrice);
    
    // Validasi QR string
    if (!payment || !payment.qr_string) {
      console.error('❌ Payment response:', payment);
      throw new Error('QR String tidak ditemukan dari Pakasir');
    }
    
    console.log('✅ Payment created:', payment.id);
    console.log('✅ QR String length:', payment.qr_string.length);
    
    // ✅ SIMPAN KE SQLITE (bukan global.rpg.data)
    const metadata = JSON.stringify({
      type: subCommand,
      duration: parseInt(duration),
      limit_amount: subCommand === 'limit' ? parseInt(duration) : undefined,
      expired_at: subCommand !== 'limit' ? Math.floor(Date.now() / 1000) + (parseInt(duration) * 86400) : undefined,
      created_at: Date.now(),
      qr_string: payment.qr_string
    });

    global.sqlite
      .prepare(`
        INSERT INTO orders (
          id, user_id, item, quantity, total_price, 
          status, payment_id, target_id, metadata, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        orderId,
        jid,
        subCommand === 'limit' ? 'limit' : subCommand,
        subCommand === 'limit' ? parseInt(duration) : 1,
        totalPrice,
        'pending',
        payment.id || orderId,
        jid,
        metadata,
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000)
      );
    
    // Generate QR
    const qrBuffer = await generateQR(payment.qr_string);
    const qrBase64 = `data:image/png;base64,${qrBuffer.toString('base64')}`;
    const qrImage = Buffer.from(qrBase64.split(',')[1], 'base64');
    
    // Simpan ke cache transaksi aktif (3 menit = 180000 ms)
    const expiredAt = Date.now() + 180000;
    activeTransactions.set(orderId, {
      jid,
      order_id: orderId,
      status: 'pending',
      expired_at: expiredAt,
      type: subCommand,
      amount: totalPrice,
      qr_message_id: null,
      qr_message_chat: null
    });
    
    // ============================================
    // 8. KIRIM QR CODE
    // ============================================
    const itemDisplay = 
      subCommand === 'limit' ? `Limit ${duration}` :
      subCommand === 'rent' ? `Rent Group ${duration} Hari` :
      `Jadibot ${duration} Hari`;
    
    const caption = 
      `💰 *${subCommand === 'limit' ? 'Beli Limit' : subCommand === 'rent' ? 'Rent Group' : 'Jadibot'}*\n` +
      `📦 ${itemDisplay}\n` +
      `💳 Harga: ${formatRupiah(totalPrice)}\n\n` +
      `🆔 *Order ID:* ${orderId}\n` +
      `⏰ *Expired:* 3 menit\n\n` +
      `📌 *Cara Bayar:*\n` +
      `1. Scan QR Code diatas\n` +
      `2. Transfer Rp ${formatRupiah(totalPrice)}\n` +
      `3. Tunggu otomatis terproses\n` +
      `4. Atau ketik ${usedPrefix + command} cek ${orderId}\n\n` +
      `⚠️ *Transaksi akan batal otomatis jika tidak dibayar dalam 3 menit!*`;
    
    // Kirim QR dan simpan ID pesan
    const sentMsg = await conn.sendMessage(m.chat, {
      image: qrImage,
      caption: caption
    }, { quoted: m });
    
    // Simpan ID pesan QR ke cache
    const tx = activeTransactions.get(orderId);
    if (tx && sentMsg.key) {
      tx.qr_message_id = sentMsg.key.id;
      tx.qr_message_chat = m.chat;
    }
    
    // ============================================
    // 9. AUTO CHECK & CANCEL (3 MENIT)
    // ============================================
    console.log(`🔄 Auto check started for ${orderId}`);
    
    let isProcessing = false;
    
    const checkInterval = setInterval(async () => {
      if (isProcessing) return;
      isProcessing = true;

      try {
        const tx = activeTransactions.get(orderId);
        if (!tx || tx.status !== 'pending') {
          clearInterval(checkInterval);
          isProcessing = false;
          return;
        }

        console.log(`🔍 Checking ${orderId}...`);

        // ✅ FIX: Sertakan amount
        const transaction = await checkTransaction(orderId, totalPrice);
        const status = transaction.status?.toLowerCase();
        console.log(`📊 Status ${orderId}: ${status}`);

        // ✅ STATUS SUKSES
        if (status === 'paid') {
          console.log(`✅ ${orderId} PAID! Processing...`);

          await processSuccessPayment(orderId);

          tx.status = 'paid';
          clearInterval(checkInterval);

          await deleteQRMessage(conn, tx);
          await sendSuccessNotification(conn, m, orderId, subCommand, duration, totalPrice);

          setTimeout(() => activeTransactions.delete(orderId), 5000);
          isProcessing = false;
          return;
        }

        // ❌ STATUS CANCELED - FIXED: Pakai SQLite
        if (status === 'canceled' || status === 'cancelled') {
          console.log(`❌ ${orderId} CANCELED!`);

          const order = global.sqlite
            .prepare(`SELECT * FROM orders WHERE id = ?`)
            .get(orderId);

          if (order) {
            global.sqlite
              .prepare(`UPDATE orders SET status = 'canceled', updated_at = unixepoch() WHERE id = ?`)
              .run(orderId);
          }

          tx.status = 'canceled';
          clearInterval(checkInterval);

          await deleteQRMessage(conn, tx);

          await conn.sendMessage(m.chat, {
            text: `❌ *Pembayaran Dibatalkan!*\n\n` +
                  `🆔 Order: ${orderId}\n` +
                  `💳 ${formatRupiah(totalPrice)}\n\n` +
                  `Transaksi dibatalkan oleh sistem. Silahkan buat transaksi baru dengan ${usedPrefix + command}`
          }, { quoted: m });

          setTimeout(() => activeTransactions.delete(orderId), 5000);
          isProcessing = false;
          return;
        }

        // ⏰ STATUS EXPIRED - FIXED: Pakai SQLite
        if (status === 'expired') {
          console.log(`⏰ ${orderId} EXPIRED!`);

          const order = global.sqlite
            .prepare(`SELECT * FROM orders WHERE id = ?`)
            .get(orderId);

          if (order) {
            global.sqlite
              .prepare(`UPDATE orders SET status = 'expired', updated_at = unixepoch() WHERE id = ?`)
              .run(orderId);
          }

          tx.status = 'expired';
          clearInterval(checkInterval);

          await deleteQRMessage(conn, tx);

          await conn.sendMessage(m.chat, {
            text: `⏰ *Transaksi Kadaluarsa!*\n\n` +
                  `🆔 Order: ${orderId}\n` +
                  `💳 ${formatRupiah(totalPrice)}\n\n` +
                  `Transaksi dibatalkan karena tidak dibayar dalam 3 menit.\n` +
                  `Silahkan buat transaksi baru dengan ${usedPrefix + command}`
          }, { quoted: m });

          setTimeout(() => activeTransactions.delete(orderId), 5000);
          isProcessing = false;
          return;
        }

        // ❌ STATUS FAILED - FIXED: Pakai SQLite
        if (status === 'failed') {
          console.log(`❌ ${orderId} FAILED!`);

          const order = global.sqlite
            .prepare(`SELECT * FROM orders WHERE id = ?`)
            .get(orderId);

          if (order) {
            global.sqlite
              .prepare(`UPDATE orders SET status = 'failed', updated_at = unixepoch() WHERE id = ?`)
              .run(orderId);
          }

          tx.status = 'failed';
          clearInterval(checkInterval);

          await deleteQRMessage(conn, tx);

          await conn.sendMessage(m.chat, {
            text: `❌ *Pembayaran Gagal!*\n\n` +
                  `🆔 Order: ${orderId}\n` +
                  `💳 ${formatRupiah(totalPrice)}\n\n` +
                  `Terjadi kesalahan pada pembayaran. Silahkan coba lagi.`
          }, { quoted: m });

          setTimeout(() => activeTransactions.delete(orderId), 5000);
          isProcessing = false;
          return;
        }

        console.log(`⏳ ${orderId} masih pending...`);

      } catch (e) {
        console.error(`❌ Auto check error ${orderId}:`, e.message);
      } finally {
        isProcessing = false;
      }
    }, 5000);
    
    // Auto cancel setelah 3 menit - FIXED: Pakai SQLite
    setTimeout(async () => {
      try {
        const tx = activeTransactions.get(orderId);
        if (tx && tx.status === 'pending') {
          console.log(`⏰ Auto-cancelling ${orderId} (timeout)`);

          await cancelTransaction(orderId, totalPrice);

          const order = global.sqlite
            .prepare(`SELECT * FROM orders WHERE id = ?`)
            .get(orderId);

          if (order) {
            global.sqlite
              .prepare(`UPDATE orders SET status = 'expired', updated_at = unixepoch() WHERE id = ?`)
              .run(orderId);
          }

          tx.status = 'expired';

          await deleteQRMessage(conn, tx);

          await conn.sendMessage(m.chat, {
            text: `⏰ *Transaksi Kadaluarsa!*\n\n` +
                  `🆔 Order: ${orderId}\n` +
                  `💳 ${formatRupiah(totalPrice)}\n\n` +
                  `Transaksi dibatalkan karena tidak dibayar dalam 3 menit.\n` +
                  `Silahkan buat transaksi baru dengan ${usedPrefix + command}`
          }, { quoted: m });

          setTimeout(() => {
            activeTransactions.delete(orderId);
          }, 5000);

          clearInterval(checkInterval);
        }
      } catch (e) {
        console.error(`❌ Auto cancel error ${orderId}:`, e.message);
      }
    }, 180000);
    
  } catch (e) {
    global.logger?.error(e);
    await m.reply(`❌ Gagal membuat pembayaran: ${e.message}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

// ============================================
// FUNGSI: WAIT FOR CONFIRMATION
// ============================================
async function waitForConfirmation(m, conn) {
  return new Promise((resolve) => {
    let resolved = false;
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    }, 30000);
    
    const listener = (update) => {
      if (resolved) return;
      
      const msg = update.messages?.[0];
      if (!msg) return;
      
      if (msg.key.remoteJid === m.chat && !msg.key.fromMe) {
        const text = msg.message?.conversation || 
                    msg.message?.extendedTextMessage?.text || 
                    '';
        
        if (text.toLowerCase() === 'ya' || text.toLowerCase() === 'y') {
          resolved = true;
          clearTimeout(timeout);
          conn.ev.off('messages.upsert', listener);
          resolve(true);
        } else if (text.toLowerCase() === 'tidak' || text.toLowerCase() === 't' || text.toLowerCase() === 'no') {
          resolved = true;
          clearTimeout(timeout);
          conn.ev.off('messages.upsert', listener);
          resolve(false);
        }
      }
    };
    
    conn.ev.on('messages.upsert', listener);
  });
}

// ============================================
// FUNGSI: HAPUS PESAN QR (FIXED - 3 Methods)
// ============================================
async function deleteQRMessage(conn, tx) {
  try {
    if (!tx?.qr_message_id || !tx?.qr_message_chat) {
      console.log('⚠️ Tidak ada QR message untuk dihapus');
      return;
    }

    console.log(`🗑️ Menghapus QR message: ${tx.qr_message_id} di chat ${tx.qr_message_chat}`);

    // Method 1: Pakai delete message (WA Web)
    try {
      await conn.sendMessage(tx.qr_message_chat, {
        delete: {
          remoteJid: tx.qr_message_chat,
          fromMe: true,
          id: tx.qr_message_id
        }
      });
      console.log(`✅ QR message deleted (Method 1): ${tx.qr_message_id}`);
      return;
    } catch (e) {
      console.log(`⚠️ Method 1 gagal: ${e.message}`);
    }

    // Method 2: Kirim pesan baru dan hapus (fallback)
    try {
      // Kirim notifikasi
      await conn.sendMessage(tx.qr_message_chat, {
        text: '⏰ *Transaksi telah selesai* - QR Code otomatis dihapus'
      });
      
      // Coba hapus pesan lama dengan protokol
      await conn.sendMessage(tx.qr_message_chat, {
        delete: {
          remoteJid: tx.qr_message_chat,
          fromMe: true,
          id: tx.qr_message_id
        }
      });
      console.log(`✅ QR message deleted (Method 2): ${tx.qr_message_id}`);
    } catch (e) {
      console.log(`⚠️ Method 2 gagal: ${e.message}`);
    }

    // Method 3: Edit pesan jadi expired (paling aman)
    try {
      await conn.sendMessage(tx.qr_message_chat, {
        text: `⏰ *Transaksi Kadaluarsa*\n\nQR Code telah dihapus otomatis.`
      }, {
        edit: tx.qr_message_id
      });
      console.log(`✅ QR message edited (Method 3): ${tx.qr_message_id}`);
    } catch (e) {
      console.log(`⚠️ Method 3 gagal: ${e.message}`);
    }

  } catch (e) {
    console.error('❌ Gagal hapus QR:', e.message);
  }
}

// ============================================
// FUNGSI: KIRIM NOTIFIKASI SUKSES
// ============================================
async function sendSuccessNotification(conn, m, orderId, subCommand, duration, totalPrice) {
  const itemDisplay = 
    subCommand === 'limit' ? `Limit ${duration}` :
    subCommand === 'rent' ? `Rent Group ${duration} Hari` :
    `Jadibot ${duration} Hari`;
  
  const successMsg = 
    `✅ *Pembayaran Berhasil!*\n\n` +
    `📦 ${itemDisplay}\n` +
    `💰 ${formatRupiah(totalPrice)}\n\n` +
    `${subCommand === 'limit' ? '📊 Limit berhasil ditambahkan!' : ''}\n` +
    `${subCommand === 'rent' ? '🏠 Rent Group berhasil diaktifkan!' : ''}\n` +
    `${subCommand === 'jadibot' ? '🤖 Jadibot berhasil diaktifkan!' : ''}`;
  
  await conn.sendMessage(m.chat, { text: successMsg }, { quoted: m });
  
  // Notifikasi ke owner
  const owner = global.config?.owner || '';
  if (owner) {
    try {
      await conn.sendMessage(owner, {
        text: `✅ *Payment Success!*\n\n` +
              `🆔 Order: ${orderId}\n` +
              `👤 User: ${m.sender}\n` +
              `📦 Item: ${itemDisplay}\n` +
              `💰 Amount: ${formatRupiah(totalPrice)}`
      });
    } catch (e) {
      console.error('❌ Gagal kirim notif owner:', e.message);
    }
  }
}

// ============================================
// FUNGSI: PROCESS SUCCESS PAYMENT
// ============================================
async function processSuccessPayment(orderId) {
  const order = global.sqlite
    .prepare(`SELECT * FROM orders WHERE id = ?`)
    .get(orderId);
  
  if (!order) throw new Error('Order tidak ditemukan');
  
  // Cegah reward diberikan dua kali
  if (order.status === 'paid') return { success: true, alreadyProcessed: true };
  
  const metadata = JSON.parse(order.metadata || '{}');
  
  const user = global.sqlite
    .prepare(`SELECT * FROM user WHERE jid = ?`)
    .get(order.user_id);
  
  if (!user) throw new Error('User tidak ditemukan');
  
  global.sqlite
    .prepare(`UPDATE orders SET status = 'paid', updated_at = unixepoch() WHERE id = ?`)
    .run(orderId);
  
  switch(metadata.type) {
    case 'limit': {
      const newLimit = (user.user_limit || 0) + (metadata.limit_amount || order.quantity);
      global.sqlite
        .prepare(`UPDATE user SET user_limit = ? WHERE jid = ?`)
        .run(newLimit, order.user_id);
      console.log(`✅ +${metadata.limit_amount} Limit untuk ${order.user_id}`);
      break;
    }
      
    case 'rent': {
      const existingRent = global.sqlite
        .prepare(`SELECT * FROM rent WHERE jid = ?`)
        .get(order.user_id);
      
      if (!existingRent) {
        global.sqlite
          .prepare(`INSERT INTO rent (jid, expired, created_at, updated_at) VALUES (?, ?, unixepoch(), unixepoch())`)
          .run(order.user_id, metadata.expired_at);
        console.log(`✅ Rent Group baru untuk ${order.user_id}`);
      } else {
        const currentExpired = existingRent.expired || 0;
        const now = Math.floor(Date.now() / 1000);
        const newExpired = Math.max(currentExpired, now) + (metadata.duration * 86400);
        global.sqlite
          .prepare(`UPDATE rent SET expired = ?, updated_at = unixepoch() WHERE jid = ?`)
          .run(newExpired, order.user_id);
        console.log(`✅ Rent Group diperpanjang untuk ${order.user_id}`);
      }
      break;
    }
      
    case 'jadibot': {
      const existingJadibot = global.sqlite
        .prepare(`SELECT * FROM jadibot WHERE jid = ?`)
        .get(order.user_id);
      
      if (!existingJadibot) {
        global.sqlite
          .prepare(`INSERT INTO jadibot (jid, expired, created_at, updated_at) VALUES (?, ?, unixepoch(), unixepoch())`)
          .run(order.user_id, metadata.expired_at);
        console.log(`✅ Jadibot baru untuk ${order.user_id}`);
      } else {
        const currentExpired = existingJadibot.expired || 0;
        const now = Math.floor(Date.now() / 1000);
        const newExpired = Math.max(currentExpired, now) + (metadata.duration * 86400);
        global.sqlite
          .prepare(`UPDATE jadibot SET expired = ?, updated_at = unixepoch() WHERE jid = ?`)
          .run(newExpired, order.user_id);
        console.log(`✅ Jadibot diperpanjang untuk ${order.user_id}`);
      }
      break;
    }
  }
  
  global.logger?.info({
    event: 'payment_success',
    order_id: orderId,
    user_id: order.user_id,
    type: metadata.type,
    amount: order.total_price
  });
  
  return { success: true };
}

// ============================================
// FUNGSI: CEK ORDER (FIXED - Dengan Amount)
// ============================================
async function checkOrder(m, orderId, usedPrefix, command) {
  try {
    await global.loading(m, m.conn);
    
    const cached = activeTransactions.get(orderId);
    
    const order = global.sqlite
      .prepare(`SELECT * FROM orders WHERE id = ?`)
      .get(orderId);
    
    if (!order) {
      return m.reply('❌ Order ID tidak ditemukan!');
    }
    
    if (order.user_id !== m.sender) {
      return m.reply('❌ Ini bukan order kamu!');
    }
    
    // ✅ FIX: Sertakan amount
    const transaction = await checkTransaction(orderId, order.total_price);
    const status = transaction.status?.toLowerCase();
    
    // Update status jika berbeda
    if (status !== order.status?.toLowerCase()) {
      global.sqlite
        .prepare(`UPDATE orders SET status = ?, updated_at = unixepoch() WHERE id = ?`)
        .run(status, orderId);
      
      order.status = status;
      
      // ========================================
      // TANGANI SEMUA STATUS FINAL
      // ========================================
      
      if (status === 'paid') {
        await processSuccessPayment(orderId);
        
        if (cached) {
          cached.status = 'paid';
          await deleteQRMessage(m.conn, cached);
          setTimeout(() => activeTransactions.delete(orderId), 5000);
        }
        
        const metadata = JSON.parse(order.metadata || '{}');
        const itemDisplay = 
          metadata.type === 'limit' ? `Limit ${metadata.limit_amount}` :
          metadata.type === 'rent' ? `Rent Group ${metadata.duration} Hari` :
          metadata.type === 'jadibot' ? `Jadibot ${metadata.duration} Hari` :
          order.item;
        
        return m.reply(
          `✅ *Pembayaran Berhasil!*\n\n` +
          `📦 ${itemDisplay}\n` +
          `💰 ${formatRupiah(order.total_price)}\n\n` +
          `📊 Produk berhasil ditambahkan!`
        );
      }
      
      if (status === 'canceled' || status === 'cancelled') {
        if (cached) {
          cached.status = 'canceled';
          await deleteQRMessage(m.conn, cached);
          setTimeout(() => activeTransactions.delete(orderId), 5000);
        }
        
        return m.reply(
          `❌ *Pembayaran Dibatalkan*\n\n` +
          `🆔 Order: ${orderId}\n` +
          `💳 ${formatRupiah(order.total_price)}\n\n` +
          `Transaksi ini telah dibatalkan oleh sistem.\n` +
          `Silahkan buat transaksi baru dengan ${usedPrefix + command}`
        );
      }
      
      if (status === 'expired') {
        if (cached) {
          cached.status = 'expired';
          await deleteQRMessage(m.conn, cached);
          setTimeout(() => activeTransactions.delete(orderId), 5000);
        }
        
        return m.reply(
          `⏰ *Transaksi Kadaluarsa*\n\n` +
          `🆔 Order: ${orderId}\n` +
          `💳 ${formatRupiah(order.total_price)}\n\n` +
          `Waktu pembayaran sudah habis.\n` +
          `Silahkan buat transaksi baru dengan ${usedPrefix + command}`
        );
      }
      
      if (status === 'failed') {
        if (cached) {
          cached.status = 'failed';
          await deleteQRMessage(m.conn, cached);
          setTimeout(() => activeTransactions.delete(orderId), 5000);
        }
        
        return m.reply(
          `❌ *Pembayaran Gagal*\n\n` +
          `🆔 Order: ${orderId}\n` +
          `💳 ${formatRupiah(order.total_price)}\n\n` +
          `Terjadi kesalahan pada pembayaran.\n` +
          `Silahkan buat transaksi baru dengan ${usedPrefix + command}`
        );
      }
    }
    
    // Tampilkan status
    const statusMap = {
      'pending': '⏳ Menunggu pembayaran',
      'paid': '✅ Sudah dibayar',
      'expired': '⏰ Kadaluarsa',
      'canceled': '❌ Dibatalkan',
      'cancelled': '❌ Dibatalkan',
      'failed': '❌ Gagal'
    };
    
    let timeLeft = '';
    if (cached && cached.status === 'pending') {
      const remaining = Math.ceil((cached.expired_at - Date.now()) / 60000);
      if (remaining > 0) {
        timeLeft = `⏰ Sisa waktu: ${remaining} menit\n`;
      } else {
        timeLeft = `⏰ Transaksi sudah kadaluarsa\n`;
      }
    }
    
    const metadata = JSON.parse(order.metadata || '{}');
    const itemDisplay = 
      metadata.type === 'limit' ? `Limit ${metadata.limit_amount}` :
      metadata.type === 'rent' ? `Rent Group ${metadata.duration} Hari` :
      metadata.type === 'jadibot' ? `Jadibot ${metadata.duration} Hari` :
      order.item;
    
    return m.reply(
      `📊 *Status Order*\n\n` +
      `🆔 Order: ${orderId}\n` +
      `📦 Item: ${itemDisplay}\n` +
      `💰 Total: ${formatRupiah(order.total_price)}\n` +
      `📌 Status: ${statusMap[status] || status}\n` +
      `${timeLeft}` +
      `🕐 Dibuat: ${new Date(order.created_at * 1000).toLocaleString('id-ID')}\n\n` +
      `${status === 'pending' ? '💡 Tunggu pembayaran atau scan ulang QR Code' : ''}`
    );
    
  } catch (e) {
    global.logger?.error(e);
    return m.reply(`❌ Gagal cek status: ${e.message}`);
  } finally {
    await global.loading(m, m.conn, true);
  }
}

// ============================================
// FUNGSI: FORMAT RUPIAH
// ============================================
function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// ============================================
// METADATA PLUGIN
// ============================================
handler.help = ['bayar <limit/rent/jadibot> <durasi>'];
handler.tags = ['rpg'];
handler.command = /^(bayar|pay|topup)$/i;
handler.private = false;

export default handler;