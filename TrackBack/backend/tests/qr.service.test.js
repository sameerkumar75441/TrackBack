import assert from 'node:assert/strict';
import test from 'node:test';
import { createHandoverToken, hashHandoverToken } from '../src/services/qr.service.js';

test('handover tokens are opaque, hashed, and QR-renderable', async () => {
  const first = await createHandoverToken();
  const second = await createHandoverToken();
  const mobile = await createHandoverToken('https://trackback.example');
  assert.match(first.token, /^[A-Za-z0-9_-]{40,}$/);
  assert.notEqual(first.token, second.token);
  assert.equal(hashHandoverToken(first.token), first.tokenHash);
  assert.notEqual(first.tokenHash, first.token);
  assert.match(first.qrDataUrl, /^data:image\/png;base64,/);
  assert.match(mobile.qrPayload, /^https:\/\/trackback\.example\/handover\?token=[A-Za-z0-9_-]{40,}$/);
  assert.ok(mobile.qrPayload.endsWith(mobile.token));
});
