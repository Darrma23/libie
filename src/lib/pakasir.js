// src/lib/pakasir.js
import QRCode from "qrcode";

const BASE_URL = "https://app.pakasir.com/api";

// === PAKAI Bun.env LANGSUNG ===
const apiKey = Bun.env.PAKASIR_API_KEY?.trim() || global.config?.pakasir_api_key?.trim();
const project = Bun.env.PAKASIR_SLUG?.trim() || global.config?.pakasir_slug?.trim() || "libiebot";

console.log('🔑 API Key loaded:', apiKey ? '✅ YES (length: ' + apiKey.length + ')' : '❌ NO');
console.log('📁 Project:', project);

if (!apiKey) {
  throw new Error("PAKASIR_API_KEY tidak ditemukan");
}

async function request(endpoint, options = {}) {
  console.log(`📤 Request to: ${BASE_URL}${endpoint}`);
  
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  const text = await res.text();
  console.log(`📥 Raw response (${res.status}):`, text.substring(0, 200) + '...');
  
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
  }

  if (!res.ok) {
    throw new Error(`PAKASIR ${res.status}: ${data.message || JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Membuat transaksi QRIS
 */
export async function createTransaction(orderId, amount, method = "qris") {
  console.log(`🔨 Creating transaction: ${orderId} - Rp${amount}`);
  
  const data = await request(`/transactioncreate/${method}`, {
    method: "POST",
    body: JSON.stringify({
      project: project,
      order_id: orderId,
      amount: amount,
      api_key: apiKey
    })
  });

  console.log('📦 Data received:', JSON.stringify(data, null, 2));

  if (!data) {
    throw new Error("Response kosong dari Pakasir");
  }

  const payment = data.payment || data.data || data;
  
  if (!payment) {
    throw new Error(`Response Pakasir tidak valid: ${JSON.stringify(data)}`);
  }

  const qrString = payment.qr_string || payment.payment_number || payment.qrCode || payment.qr;
  if (!qrString) {
    throw new Error(`QR String tidak ditemukan: ${JSON.stringify(payment)}`);
  }

  return {
    id: payment.id || payment.payment_id || `pay_${orderId}`,
    order_id: payment.order_id || orderId,
    amount: payment.amount || payment.total_payment || amount,
    status: payment.status || payment.payment_status || 'pending',
    qr_string: qrString,
    qr_url: payment.qr_url || payment.payment_url || '',
    expired_at: new Date(payment.expired_at).getTime() / 1000 || Math.floor(Date.now() / 1000) + 300,
    raw: payment
  };
}

/**
 * Mengecek status transaksi
 */
export async function checkTransaction(orderId, amount) {
  const query = new URLSearchParams({
    project: project,
    amount: String(amount),
    order_id: orderId,
    api_key: apiKey
  });

  const data = await request(`/transactiondetail?${query}`);

  const transaction = data.transaction || data.data || data;
  
  if (!transaction) {
    throw new Error(`Response transaction tidak valid: ${JSON.stringify(data)}`);
  }

  return {
    id: transaction.id || transaction.payment_id,
    order_id: transaction.order_id || orderId,
    amount: transaction.amount || amount,
    status: transaction.status || transaction.payment_status || 'pending',
    paid_at: transaction.paid_at || transaction.payment_time,
    raw: transaction
  };
}

/**
 * Membatalkan transaksi
 */
export async function cancelTransaction(orderId, amount) {
  const data = await request("/transactioncancel", {
    method: "POST",
    body: JSON.stringify({
      project: project,
      order_id: orderId,
      amount: amount,
      api_key: apiKey
    })
  });

  return data;
}

/**
 * Generate QR Code dari QR String Pakasir
 */
export async function generateQR(qrString) {
  if (!qrString) {
    throw new Error("QR String tidak boleh kosong");
  }

  console.log(`📱 Generating QR code (length: ${qrString.length})...`);

  return QRCode.toBuffer(qrString, {
    type: "png",
    width: 512,
    margin: 2,
    errorCorrectionLevel: "M"
  });
}

/**
 * Simulasi pembayaran (Sandbox)
 */
export async function simulateTransaction(orderId, amount) {
  return request("/paymentsimulation", {
    method: "POST",
    body: JSON.stringify({
      project: project,
      order_id: orderId,
      amount: amount,
      api_key: apiKey
    })
  });
}