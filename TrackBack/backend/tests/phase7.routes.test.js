import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/User.js';

const secret = 'phase7-route-test-secret';
const userId = '507f1f77bcf86cd799439011';
const withServer = async (callback) => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try { await callback(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
};
const token = (role) => jwt.sign({ userId, role }, secret, { expiresIn: '1h' });

test('Phase 7 routes enforce authentication, rating validation, and admin-only reporting', { concurrency: false }, async (context) => {
  const originalFindById = User.findById;
  process.env.JWT_SECRET = secret;
  User.findById = async () => ({ id: userId, role: 'student', status: 'active', name: 'Student' });
  context.after(() => { User.findById = originalFindById; });
  await withServer(async (baseUrl) => {
    const unauthenticated = await fetch(`${baseUrl}/api/notifications`);
    assert.equal(unauthenticated.status, 401);
    const invalidRating = await fetch(`${baseUrl}/api/ratings`, { method: 'POST', headers: { Authorization: `Bearer ${token('student')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ claimId: userId, rating: 8 }) });
    assert.equal(invalidRating.status, 400);
    const analytics = await fetch(`${baseUrl}/api/admin/analytics`, { headers: { Authorization: `Bearer ${token('student')}` } });
    assert.equal(analytics.status, 403);
    const csv = await fetch(`${baseUrl}/api/admin/export.csv`, { headers: { Authorization: `Bearer ${token('student')}` } });
    assert.equal(csv.status, 403);
    const storage = await fetch(`${baseUrl}/api/items/${userId}/storage`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token('student')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ storageLocation: 'Shelf A-12' }),
    });
    assert.equal(storage.status, 403);
  });
});
