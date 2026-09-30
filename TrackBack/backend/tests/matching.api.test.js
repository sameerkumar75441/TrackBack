import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import Item from '../src/models/Item.js';
import User from '../src/models/User.js';

const nativeFetch = globalThis.fetch;
const secret = 'matching-test-secret';
const userId = '507f1f77bcf86cd799439011';
const lostId = '507f1f77bcf86cd799439012';
const foundId = '507f1f77bcf86cd799439013';

const user = { id: userId, role: 'student', status: 'active' };
const item = (id, type) => ({
  id,
  title: `${type} blue backpack`,
  description: 'Blue backpack with laptop pocket',
  type,
  category: 'bags',
  colour: 'blue',
  brand: 'Northwind',
  location: 'Library',
  date: new Date('2026-09-20T10:00:00Z'),
  images: [],
  status: 'approved',
  reportedBy: { toString: () => userId },
});

const expectedMatch = {
  ruleScore: 100,
  ruleScoreNormalized: 1,
  textScore: 1,
  imageScore: null,
  imageAvailable: false,
  finalScore: 1,
};

const startServer = async (callback) => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

const token = () => jwt.sign({ userId, role: 'student' }, secret, { expiresIn: '1h' });

test('matching endpoint rejects missing authentication', { concurrency: false }, async () => {
  await startServer(async (baseUrl) => {
    const response = await nativeFetch(`${baseUrl}/api/matches/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lostItemId: lostId, foundItemId: foundId }),
    });
    assert.equal(response.status, 401);
  });
});

test('matching endpoint validates ids and accepts a lost/found pair', { concurrency: false }, async (context) => {
  const originalFindUser = User.findById;
  const originalFindItem = Item.findById;
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.MATCHING_SERVICE_URL;
  process.env.JWT_SECRET = secret;
  process.env.MATCHING_SERVICE_URL = 'http://matching.test';
  User.findById = async () => user;
  Item.findById = async (id) => ({ [lostId]: item(lostId, 'lost'), [foundId]: item(foundId, 'found') })[id];
  globalThis.fetch = async () => ({ ok: true, json: async () => expectedMatch });
  context.after(() => {
    User.findById = originalFindUser;
    Item.findById = originalFindItem;
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.MATCHING_SERVICE_URL;
    else process.env.MATCHING_SERVICE_URL = originalUrl;
  });

  await startServer(async (baseUrl) => {
    const headers = { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' };
    const invalidId = await nativeFetch(`${baseUrl}/api/matches/compare`, {
      method: 'POST', headers, body: JSON.stringify({ lostItemId: 'invalid', foundItemId: foundId }),
    });
    assert.equal(invalidId.status, 400);

    const validPair = await nativeFetch(`${baseUrl}/api/matches/compare`, {
      method: 'POST', headers, body: JSON.stringify({ lostItemId: lostId, foundItemId: foundId }),
    });
    assert.equal(validPair.status, 200);
    assert.deepEqual((await validPair.json()).match, expectedMatch);
  });
});

test('matching endpoint rejects same-type pairs and handles service failure', { concurrency: false }, async (context) => {
  const originalFindUser = User.findById;
  const originalFindItem = Item.findById;
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.MATCHING_SERVICE_URL;
  process.env.JWT_SECRET = secret;
  process.env.MATCHING_SERVICE_URL = 'http://matching.test';
  User.findById = async () => user;
  context.after(() => {
    User.findById = originalFindUser;
    Item.findById = originalFindItem;
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.MATCHING_SERVICE_URL;
    else process.env.MATCHING_SERVICE_URL = originalUrl;
  });

  await startServer(async (baseUrl) => {
    const headers = { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' };
    Item.findById = async (id) => ({ [lostId]: item(lostId, 'lost'), [foundId]: item(foundId, 'lost') })[id];
    const sameType = await nativeFetch(`${baseUrl}/api/matches/compare`, {
      method: 'POST', headers, body: JSON.stringify({ lostItemId: lostId, foundItemId: foundId }),
    });
    assert.equal(sameType.status, 400);

    Item.findById = async (id) => ({ [lostId]: item(lostId, 'lost'), [foundId]: item(foundId, 'found') })[id];
    globalThis.fetch = async () => { throw new Error('service offline'); };
    const unavailable = await nativeFetch(`${baseUrl}/api/matches/compare`, {
      method: 'POST', headers, body: JSON.stringify({ lostItemId: lostId, foundItemId: foundId }),
    });
    assert.equal(unavailable.status, 503);
  });
});
