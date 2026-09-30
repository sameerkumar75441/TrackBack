import assert from 'node:assert/strict';
import test from 'node:test';
import Claim from '../src/models/Claim.js';
import Item from '../src/models/Item.js';
import Notification from '../src/models/Notification.js';
import Rating from '../src/models/Rating.js';
import { getAnalytics } from '../src/services/admin.service.js';
import { createAdminCsv } from '../src/services/export.service.js';
import { listNotifications, markRead } from '../src/services/notification.service.js';
import { createRating } from '../src/services/rating.service.js';

const student = { id: '507f1f77bcf86cd799439011', role: 'student' };
const id = '507f1f77bcf86cd799439012';

test('notifications are scoped to the current recipient and cannot be read by someone else', { concurrency: false }, async (context) => {
  const listCalls = [];
  const originalFind = Notification.find;
  const originalUpdate = Notification.findOneAndUpdate;
  Notification.find = (query) => ({ sort: () => ({ limit: () => ({ lean: async () => { listCalls.push(query); return [{ _id: id, read: false }]; } }) }) });
  Notification.findOneAndUpdate = async (query) => (query.recipient === student.id ? { id, read: true } : null);
  context.after(() => { Notification.find = originalFind; Notification.findOneAndUpdate = originalUpdate; });
  const result = await listNotifications(student);
  assert.equal(listCalls[0].recipient, student.id);
  assert.equal(result.unreadCount, 1);
  await assert.rejects(markRead(id, { id: 'other' }), (error) => error.statusCode === 404);
});

test('ratings require the student’s completed handover and prevent duplicates', { concurrency: false }, async (context) => {
  const originalFindOne = Claim.findOne;
  const originalCreate = Rating.create;
  Claim.findOne = async (query) => query.claimant === student.id ? { id, item: id } : null;
  Rating.create = async (payload) => payload;
  context.after(() => { Claim.findOne = originalFindOne; Rating.create = originalCreate; });
  const rating = await createRating(id, 5, 'Helpful and secure.', student);
  assert.equal(rating.rating, 5);
  await assert.rejects(createRating(id, 5, '', { id: student.id, role: 'security' }), (error) => error.statusCode === 403);
  Rating.create = async () => { const error = new Error('duplicate'); error.code = 11000; throw error; };
  await assert.rejects(createRating(id, 5, '', student), (error) => error.statusCode === 409);
});

test('analytics returns aggregation-backed status structures', { concurrency: false }, async (context) => {
  const originalItemAggregate = Item.aggregate;
  const originalClaimAggregate = Claim.aggregate;
  let itemCalls = 0;
  Item.aggregate = async () => (++itemCalls === 1 ? [{ _id: 'approved', count: 3 }] : [{ _id: 'lost', count: 2 }]);
  let claimCalls = 0;
  Claim.aggregate = async () => (++claimCalls === 1 ? [{ _id: 'completed', count: 1 }] : [{ _id: '2030-01', count: 1 }]);
  context.after(() => { Item.aggregate = originalItemAggregate; Claim.aggregate = originalClaimAggregate; });
  const result = await getAnalytics();
  assert.equal(result.itemStatus.approved, 3);
  assert.equal(result.itemTypes.lost, 2);
  assert.equal(result.claimStatus.completed, 1);
  assert.deepEqual(result.handoverTrend, [{ month: '2030-01', count: 1 }]);
});

test('admin CSV escapes values and excludes ownership proof and QR secrets', { concurrency: false }, async (context) => {
  const originalItemFind = Item.find;
  const originalClaimFind = Claim.find;
  const query = (value) => ({ select: () => ({ lean: async () => value }) });
  Item.find = () => query([{ _id: id, title: 'Bag, "blue"', status: 'approved', category: 'bags', location: 'Library', createdAt: new Date('2030-01-01') }]);
  Claim.find = () => query([{ _id: id, item: id, status: 'completed', pickupSlot: 'morning', createdAt: new Date('2030-01-01'), handoverAt: new Date('2030-01-02') }]);
  context.after(() => { Item.find = originalItemFind; Claim.find = originalClaimFind; });
  const csv = await createAdminCsv();
  assert.match(csv, /"Bag, ""blue"""/);
  assert.doesNotMatch(csv, /ownershipProof|handoverToken|passwordHash/i);
});
