import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Module = require('node:module');

const adminAuth = require('../cloudfunctions/shared/adminAuth.js');

function createCollection(initialRows = []) {
  const rows = initialRows.map((row, index) => ({ _id: row._id || `row-${index}`, ...row }));
  let whereFilter = null;
  let docId = null;

  return {
    rows,
    where(filter) {
      whereFilter = filter;
      return this;
    },
    limit() {
      return this;
    },
    async get() {
      if (!whereFilter) return { data: rows };
      return {
        data: rows.filter((row) => Object.entries(whereFilter)
          .every(([key, value]) => row[key] === value))
      };
    },
    doc(id) {
      docId = id;
      return this;
    },
    async update({ data }) {
      const row = rows.find((item) => item._id === docId);
      Object.assign(row, data);
      return {};
    },
    async add({ data }) {
      const row = { _id: `row-${rows.length}`, ...data };
      rows.push(row);
      return { _id: row._id };
    }
  };
}

async function loadAdminLogin({ configRows = [], attemptRows = [] }) {
  const collections = {
    admin_config: createCollection(configRows),
    admin_sessions: createCollection([]),
    admin_login_attempts: createCollection(attemptRows)
  };

  const cloudStub = {
    DYNAMIC_CURRENT_ENV: 'test',
    init() {},
    database() {
      return {
        collection(name) {
          return collections[name];
        }
      };
    },
    getWXContext() {
      return { OPENID: 'admin-openid' };
    }
  };

  const modulePath = require.resolve('../cloudfunctions/adminLogin/index.js');
  delete require.cache[modulePath];
  const originalLoad = Module._load;
  Module._load = function loadWithWxStub(request, parent, isMain) {
    if (request === 'wx-server-sdk') {
      return cloudStub;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const adminLogin = require('../cloudfunctions/adminLogin/index.js');
    return { adminLogin, collections };
  } finally {
    delete require.cache[modulePath];
    Module._load = originalLoad;
  }
}

test('adminLogin writes a session and omits password hash from response', async () => {
  const { adminLogin, collections } = await loadAdminLogin({
    configRows: [{
      adminPasswordHash: adminAuth.hashPassword('secret', 'salt-1'),
      adminPasswordSalt: 'salt-1'
    }]
  });

  const result = await adminLogin.main({ password: 'secret' });

  assert.equal(result.ok, true);
  assert.equal(typeof result.token, 'string');
  assert.equal(typeof result.expiresAt, 'number');
  assert.equal(result.adminPasswordHash, undefined);
  assert.equal(collections.admin_sessions.rows.length, 1);
  assert.equal(collections.admin_sessions.rows[0].openid, 'admin-openid');
});

test('adminLogin records failed attempts and rejects missing config', async () => {
  const missing = await loadAdminLogin({ configRows: [] });

  await assert.rejects(() => missing.adminLogin.main(), /INVALID_ADMIN_PASSWORD/);
  assert.equal(missing.collections.admin_login_attempts.rows[0].failedAttempts, 1);

  const invalid = await loadAdminLogin({
    configRows: [{
      adminPasswordHash: adminAuth.hashPassword('secret', 'salt-1'),
      adminPasswordSalt: 'salt-1'
    }]
  });

  await assert.rejects(() => invalid.adminLogin.main({ password: 'wrong' }), /INVALID_ADMIN_PASSWORD/);
  assert.equal(invalid.collections.admin_login_attempts.rows[0].failedAttempts, 1);
});

test('adminLogin rejects locked login attempts before checking password', async () => {
  const { adminLogin, collections } = await loadAdminLogin({
    configRows: [{
      adminPasswordHash: adminAuth.hashPassword('secret', 'salt-1'),
      adminPasswordSalt: 'salt-1'
    }],
    attemptRows: [{
      openid: 'admin-openid',
      failedAttempts: 5,
      lockedUntil: Date.now() + 60000
    }]
  });

  await assert.rejects(() => adminLogin.main({ password: 'secret' }), /ADMIN_LOGIN_LOCKED/);
  assert.equal(collections.admin_sessions.rows.length, 0);
});
