import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import Claim from '../src/models/Claim.js';
import CustodyEvent from '../src/models/CustodyEvent.js';
import Item from '../src/models/Item.js';
import {
  assignStorage,
  completeHandover,
  generateQr,
  getReceipt,
  schedulePickup,
} from '../src/services/handover.service.js';
import { createHandoverToken } from '../src/services/qr.service.js';

const ids = { item: '507f1f77bcf86cd799439011', claim: '507f1f77bcf86cd799439012', student: '507f1f77bcf86cd799439013', security: '507f1f77bcf86cd799439014' };
const student = { id: ids.student, role: 'student', name: 'Student User' };
const security = { id: ids.security, role: 'security', name: 'Security User' };
const claim = () => ({ id: ids.claim, item: ids.item, claimant: { toString: () => ids.student, name: student.name }, status: 'approved', pickupDate: new Date(Date.now() + 86400000), pickupSlot: 'morning', save: async () => {}, populate: async function () { return this; } });

test('storage assignment persists location and records stored custody without claiming', { concurrency: false }, async (context) => {
  const original = Item.findOneAndUpdate; const originalEvent = CustodyEvent.create; const events = [];
  Item.findOneAndUpdate = async () => ({ id: ids.item, status: 'claim_approved', storageLocation: 'Desk A1' });
  CustodyEvent.create = async (event) => { events.push(event); return event; };
  context.after(() => { Item.findOneAndUpdate = original; CustodyEvent.create = originalEvent; });
  const item = await assignStorage(ids.item, 'Desk A1', security);
  assert.equal(item.status, 'claim_approved');
  assert.deepEqual(events[0], { item: ids.item, eventType: 'stored', performedBy: ids.security, metadata: { storageLocation: 'Desk A1' } });
});

test('pickup and QR require the approved claimant workflow and store only a hash', { concurrency: false }, async (context) => {
  const originalClaim = Claim.findById; const originalItem = Item.findById; const current = claim();
  Claim.findById = async () => current; Item.findById = async () => ({ storageLocation: 'Desk A1' });
  context.after(() => { Claim.findById = originalClaim; Item.findById = originalItem; });
  await assert.rejects(schedulePickup(ids.claim, new Date(Date.now() + 86400000), 'morning', { ...student, id: '507f1f77bcf86cd799439099' }), (e) => e.statusCode === 403);
  await schedulePickup(ids.claim, new Date(Date.now() + 86400000), 'evening', student);
  const qr = await generateQr(ids.claim, student);
  assert.match(qr.qrDataUrl, /^data:image\/png;base64,/);
  assert.match(current.handoverTokenHash, /^[a-f0-9]{64}$/);
  assert.equal(current.handoverTokenUsed, false);
});

test('handover enforces college ID, consumes QR once, claims item, records custody, and creates receipt', { concurrency: false }, async (context) => {
  const originalClaimUpdate = Claim.findOneAndUpdate; const originalItemUpdate = Item.findOneAndUpdate; const originalEvent = CustodyEvent.create;
  const generated = await createHandoverToken(); const current = claim(); const events = []; let consumed = false; let verificationQuery;
  Claim.findOneAndUpdate = async (query) => { verificationQuery = query; if (consumed) return null; consumed = true; current.status = 'completed'; current.handoverAt = new Date(); current.handoverBy = ids.security; current.handoverTokenUsed = true; return current; };
  Item.findOneAndUpdate = async () => ({ id: ids.item, title: 'Blue Bag', category: 'bags', storageLocation: 'Desk A1', status: 'claimed' });
  CustodyEvent.create = async (event) => { events.push(event); return event; };
  context.after(() => { Claim.findOneAndUpdate = originalClaimUpdate; Item.findOneAndUpdate = originalItemUpdate; CustodyEvent.create = originalEvent; if (current.receiptPath) fs.rmSync(current.receiptPath, { force: true }); });
  await assert.rejects(completeHandover(generated.token, false, security), (e) => e.statusCode === 400);
  const result = await completeHandover(generated.token, true, security);
  assert.equal(result.status, 'completed'); assert.equal(result.handoverTokenUsed, true); assert.ok(fs.existsSync(result.receiptPath));
  assert.equal(verificationQuery.handoverTokenHash, generated.tokenHash);
  assert.deepEqual(events.map((event) => event.eventType), ['verified', 'handover_completed']);
  await assert.rejects(completeHandover(generated.token, true, security), (e) => e.statusCode === 409);
});

test('receipt is protected and unavailable before a completed handover', { concurrency: false }, async (context) => {
  const originalClaim = Claim.findById; const current = claim(); current.status = 'approved';
  Claim.findById = () => ({ select: async () => current }); context.after(() => { Claim.findById = originalClaim; });
  await assert.rejects(getReceipt(ids.claim, student), (e) => e.statusCode === 409);
  await assert.rejects(getReceipt(ids.claim, { ...student, id: '507f1f77bcf86cd799439099' }), (e) => e.statusCode === 403);
});
