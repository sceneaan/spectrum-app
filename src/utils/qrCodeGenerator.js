import QRCode from 'qrcode';

/**
 * Generate QR code as SVG string for React Native (no canvas required)
 * Works with react-native-webview for displaying in HTML documents
 *
 * @param {string} qrCodeData - The data to encode in the QR code (ZATCA invoice data)
 * @returns {Promise<string>} - SVG data URL (e.g., "data:image/svg+xml,...")
 */
export const generateQRCodeBase64 = async (qrCodeData) => {
  try {
    if (!qrCodeData) {
      throw new Error('QR code data is required');
    }

    // Generate QR code as SVG string (no canvas/buffer required in React Native)
    const qrSvgString = await QRCode.toString(qrCodeData, {
      errorCorrectionLevel: 'M',
      type: 'svg',
      margin: 1,
      width: 120,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Return as data URL for embedding in HTML
    // Using encodeURIComponent instead of base64 for better compatibility
    return `data:image/svg+xml,${encodeURIComponent(qrSvgString)}`;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code: ' + error.message);
  }
};
