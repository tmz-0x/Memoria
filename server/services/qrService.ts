import crypto from 'crypto';
import QRCode from 'qrcode';

export const qrService = {
  /**
   * Generates a cryptographically secure, unpredictable random token.
   */
  generateSecureToken: (): string => {
    return crypto.randomBytes(24).toString('hex');
  },

  /**
   * Constructs the secure opaque payload for the ticket QR.
   * Does NOT encode sensitive personal data directly.
   */
  formatPayload: (token: string): string => {
    return `MEMORIA26:TICKET:${token}`;
  },

  /**
   * Generates a base64 Data URL representation of the QR code.
   */
  generateQRCodeDataUrl: async (payload: string): Promise<string> => {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
      color: {
        dark: '#0D0518',
        light: '#FFFFFF',
      },
    });
  },
};
