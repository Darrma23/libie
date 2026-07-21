import { BrowserMultiFormatReader, DecodeHintType } from '@zxing/library';

/**
 * Scan barcode dari buffer gambar
 * @param {Buffer} buffer - Gambar (JPEG/PNG)
 * @returns {Promise<string|null>} - Hasil barcode atau null
 */
export async function scanBarcode(buffer) {
  try {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      'EAN_13', 'EAN_8', 'UPC_A', 'UPC_E',
      'CODE_128', 'CODE_39', 'QR_CODE'
    ]);

    const reader = new BrowserMultiFormatReader(hints);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    const result = await reader.decodeFromImage(undefined, dataUrl);
    return result.getText();
  } catch {
    return null;
  }
}