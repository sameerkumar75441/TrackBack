import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import Claim from '../src/models/Claim.js';
import Item from '../src/models/Item.js';
import User from '../src/models/User.js';

const secret = 'handover-route-test-secret';
const ids = {
  claim: '507f1f77bcf86cd799439011',
  item: '507f1f77bcf86cd799439012',
  security: '507f1f77bcf86cd799439013',
  student: '507f1f77bcf86cd799439014',
};

const withServer = async (callback) => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

const tokenFor = (userId, role) => jwt.sign({ userId, role }, secret, { expiresIn: '1h' });

test('expired QR is rejected at the handover route without changing claim or item', { concurrency: false }, async (context) => {
  const originalFindUser = User.findById;
  const originalClaimUpdate = Claim.findOneAndUpdate;
  const originalItemUpdate = Item.findOneAndUpdate;
  let itemUpdateCalled = false;
  process.env.JWT_SECRET = secret;
  User.findById = async () => ({ id: ids.security, role: 'security', status: 'active', name: 'Security User' });
  Claim.findOneAndUpdate = async () => null;
  Item.findOneAndUpdate = async () => { itemUpdateCalled = true; return null; };
  context.after(() => {
    User.findById = originalFindUser;
    Claim.findOneAndUpdate = originalClaimUpdate;
    Item.findOneAndUpdate = originalItemUpdate;
  });

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/handover/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenFor(ids.security, 'security')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'a'.repeat(43), collegeIdVerified: true }),
    });
    assert.equal(response.status, 409);
  });
  assert.equal(itemUpdateCalled, false);
});

test('invalid pickup slot is rejected at the route before claim data can change', { concurrency: false }, async (context) => {
  const originalFindUser = User.findById;
  const originalFindClaim = Claim.findById;
  let claimReadCalled = false;
  process.env.JWT_SECRET = secret;
  User.findById = async () => ({ id: ids.student, role: 'student', status: 'active', name: 'Student User' });
  Claim.findById = async () => { claimReadCalled = true; return null; };
  context.after(() => {
    User.findById = originalFindUser;
    Claim.findById = originalFindClaim;
  });

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/handover/claims/${ids.claim}/pickup`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${tokenFor(ids.student, 'student')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickupDate: '2030-01-01', pickupSlot: 'night' }),
    });
    assert.equal(response.status, 400);
  });
  assert.equal(claimReadCalled, false);
});
