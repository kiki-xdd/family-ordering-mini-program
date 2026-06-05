import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);

const adminAuth = require('../cloudfunctions/shared/adminAuth.js');

test('verifyPassword accepts matching password and salt and rejects wrong password', () => {
  const passwordHash = adminAuth.hashPassword('family-admin', 'salt-1');

  assert.equal(adminAuth.verifyPassword('family-admin', passwordHash, 'salt-1'), true);
  assert.equal(adminAuth.verifyPassword('wrong-password', passwordHash, 'salt-1'), false);
  assert.equal(passwordHash.length, 64);
});

test('isSessionValid accepts active session and rejects expired session', () => {
  const now = 1_000;

  assert.equal(adminAuth.isSessionValid({ token: 'token-1', expiresAt: now + 1 }, now), true);
  assert.equal(adminAuth.isSessionValid({ token: 'token-1', expiresAt: now }, now), false);
});

test('failed login state locks after five attempts and reset clears it', () => {
  let record = null;
  const now = 1000;

  for (let index = 0; index < 4; index += 1) {
    record = adminAuth.nextFailedLoginState(record, now);
    assert.equal(adminAuth.isLoginLocked(record, now), false);
  }

  record = adminAuth.nextFailedLoginState(record, now);
  assert.equal(record.failedAttempts, 5);
  assert.equal(adminAuth.isLoginLocked(record, now), true);

  const reset = adminAuth.resetFailedLoginState(now);
  assert.equal(reset.failedAttempts, 0);
  assert.equal(adminAuth.isLoginLocked(reset, now), false);
});

test('cloud function deploy copies stay in sync with shared admin auth helper', () => {
  const source = readFileSync(new URL('../cloudfunctions/shared/adminAuth.js', import.meta.url), 'utf8');
  const copy = readFileSync(new URL('../cloudfunctions/adminLogin/shared/adminAuth.js', import.meta.url), 'utf8');

  assert.equal(copy, source);
});
