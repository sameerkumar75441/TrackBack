import crypto from 'crypto';
import QRCode from 'qrcode';

export const createHandoverToken = async (frontendBaseUrl) => {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const baseUrl = frontendBaseUrl?.replace(/\/+$/, '');
  const qrPayload = baseUrl
    ? `${baseUrl}/handover?token=${encodeURIComponent(token)}`
    : token;
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
  });
  return { token, tokenHash, qrDataUrl, qrPayload };
};

export const hashHandoverToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
