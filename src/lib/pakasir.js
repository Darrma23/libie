// src/lib/payment/pakasir.js

export async function createPayment(orderId, amount, customerName) {
  const apiKey = process.env.PAKASIR_API_KEY || global.config?.pakasir_api_key;
  const project = process.env.PAKASIR_SLUG || global.config?.pakasir_slug || 'libiebot';
  
  if (!apiKey) {
    throw new Error('PAKASIR_API_KEY tidak ditemukan di .env');
  }

  console.log('📤 Creating payment:', { orderId, amount, customerName, project });

  const response = await fetch('https://app.pakasir.com/api/transactioncreate/qris', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      project: project,
      order_id: orderId,
      amount: amount,
      api_key: apiKey,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ PAKASIR Error:', response.status, errorText);
    throw new Error(`PAKASIR API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('✅ Payment created:', data);
  
  // Response dari PAKASIR: { payment: { payment_number, total_payment, ... } }
  const payment = data.payment || data;
  
  if (!payment.payment_number) {
    throw new Error('PAKASIR tidak mengembalikan QR string');
  }

  // QR string bisa langsung ditampilkan, atau convert ke gambar
  return {
    qr_string: payment.payment_number,
    qr_image_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payment.payment_number)}`,
    total_payment: payment.total_payment || amount,
    expired_at: payment.expired_at,
    payment_method: payment.payment_method || 'qris',
  };
}

/**
 * Cek status transaksi
 */
export async function checkPayment(orderId, amount) {
  const apiKey = process.env.PAKASIR_API_KEY || global.config?.pakasir_api_key;
  const project = process.env.PAKASIR_SLUG || global.config?.pakasir_slug || 'libiebot';

  const url = `https://app.pakasir.com/api/transactiondetail?project=${project}&amount=${amount}&order_id=${orderId}&api_key=${apiKey}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`PAKASIR API Error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.transaction || data;
}