import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const receiptDirectory = path.resolve(process.cwd(), 'uploads', 'receipts');

export const createReceipt = async ({ claim, item, claimant, verifier }) => {
  fs.mkdirSync(receiptDirectory, { recursive: true });
  const filename = `handover-${claim.id}-${Date.now()}.pdf`;
  const filePath = path.join(receiptDirectory, filename);
  const document = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(filePath);
  document.pipe(stream);
  document.fontSize(20).text('TrackBack Secure Handover Receipt');
  document.moveDown().fontSize(12);
  document.text(`Receipt reference: ${claim.id}`);
  document.text(`Item: ${item.title} (${item.category})`);
  document.text(`Claimant: ${claimant.name}`);
  document.text(`Handover date: ${claim.handoverAt.toISOString()}`);
  document.text(`Pickup slot: ${claim.pickupSlot}`);
  document.text(`Storage location: ${item.storageLocation}`);
  document.text(`Verified by: ${verifier.name}`);
  document.text('Status: Handed over');
  document.end();
  await new Promise((resolve, reject) => { stream.on('finish', resolve); stream.on('error', reject); });
  return filePath;
};
