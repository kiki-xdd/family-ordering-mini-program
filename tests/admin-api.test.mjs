import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Module = require('node:module');

function createCollection(initialRows = []) {
  const rows = initialRows.map((row, index) => ({ _id: row._id || `row-${index}`, ...row }));
  let whereFilter = null;
  let docId = null;
  let order = null;
  let rowLimit = null;

  return {
    rows,
    where(filter) {
      whereFilter = filter;
      return this;
    },
    orderBy(field, direction) {
      order = { field, direction };
      return this;
    },
    limit(limitValue) {
      rowLimit = limitValue;
      return this;
    },
    async get() {
      if (docId) {
        const row = rows.find((item) => item._id === docId);
        docId = null;
        return { data: row };
      }
      let data = rows;
      if (whereFilter) {
        data = data.filter((row) => Object.entries(whereFilter)
          .every(([key, value]) => row[key] === value));
      }
      if (order) {
        data = [...data].sort((left, right) => {
          const leftValue = left[order.field] ?? '';
          const rightValue = right[order.field] ?? '';
          const result = leftValue > rightValue ? 1 : leftValue < rightValue ? -1 : 0;
          return order.direction === 'desc' ? -result : result;
        });
      }
      if (rowLimit !== null) {
        data = data.slice(0, rowLimit);
      }
      whereFilter = null;
      order = null;
      rowLimit = null;
      return { data };
    },
    doc(id) {
      docId = id;
      return this;
    },
    async update({ data }) {
      const row = rows.find((item) => item._id === docId);
      if (!row) throw new Error('DOC_NOT_FOUND');
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

async function loadAdminApi(overrides = {}) {
  const collections = {
    admin_sessions: createCollection([
      { token: 'valid-token', expiresAt: Date.now() + 60000 }
    ]),
    admin_config: createCollection([]),
    audit_logs: createCollection([]),
    categories: createCollection([
      { _id: 'cat-2', name: '汤类', sortOrder: 2, enabled: true },
      { _id: 'cat-1', name: '家常菜', sortOrder: 1, enabled: true }
    ]),
    dishes: createCollection([
      { _id: 'dish-1', name: '番茄炒蛋', categoryId: 'cat-1', imageFileId: 'cloud://image', price: 12, sortOrder: 1, isOnShelf: true }
    ]),
    members: createCollection([]),
    orders: createCollection([
      { _id: 'order-1', submitterName: '妈妈', createdAt: '2026-06-05T10:00:00.000Z', items: [] },
      { _id: 'order-2', submitterName: '爸爸', createdAt: '2026-06-06T10:00:00.000Z', items: [] }
    ]),
    ...overrides
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
    }
  };

  const modulePath = require.resolve('../cloudfunctions/adminApi/index.js');
  delete require.cache[modulePath];
  const originalLoad = Module._load;
  Module._load = function loadWithWxStub(request, parent, isMain) {
    if (request === 'wx-server-sdk') {
      return cloudStub;
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const adminApi = require('../cloudfunctions/adminApi/index.js');
    return { adminApi, collections };
  } finally {
    delete require.cache[modulePath];
    Module._load = originalLoad;
  }
}

test('adminApi rejects missing or expired sessions', async () => {
  const { adminApi } = await loadAdminApi();

  await assert.rejects(
    () => adminApi.main({ action: 'listCategories' }),
    /ADMIN_SESSION_EXPIRED/
  );
});

test('adminApi lists categories in sort order and saves a new category', async () => {
  const { adminApi, collections } = await loadAdminApi();

  const list = await adminApi.main({ token: 'valid-token', action: 'listCategories' });
  assert.deepEqual(list.categories.map((category) => category.name), ['家常菜', '汤类']);

  const saved = await adminApi.main({
    token: 'valid-token',
    action: 'saveCategory',
    payload: { name: ' 主食 ', sortOrder: '3', enabled: true }
  });

  assert.equal(saved.ok, true);
  assert.equal(collections.categories.rows.at(-1).name, '主食');
  assert.equal(collections.audit_logs.rows.at(-1).targetType, 'category');
});

test('adminApi validates and saves dishes', async () => {
  const { adminApi, collections } = await loadAdminApi();

  await assert.rejects(() => adminApi.main({
    token: 'valid-token',
    action: 'saveDish',
    payload: { name: '青菜', categoryId: 'cat-1', imageFileId: '', price: '8' }
  }), /DISH_IMAGE_REQUIRED/);

  await adminApi.main({
    token: 'valid-token',
    action: 'saveDish',
    payload: {
      _id: 'dish-1',
      name: '番茄炒蛋',
      categoryId: 'cat-1',
      imageFileId: 'cloud://new-image',
      price: '12.126',
      isOnShelf: false
    }
  });

  assert.equal(collections.dishes.rows[0].imageFileId, 'cloud://new-image');
  assert.equal(collections.dishes.rows[0].price, 12.13);
  assert.equal(collections.dishes.rows[0].isOnShelf, false);
});

test('adminApi saves members and lists recent orders', async () => {
  const { adminApi, collections } = await loadAdminApi();

  await adminApi.main({
    token: 'valid-token',
    action: 'saveMember',
    payload: { openid: ' family-openid ', displayName: ' 妈妈 ', enabled: true }
  });

  assert.equal(collections.members.rows[0].openid, 'family-openid');
  assert.equal(collections.members.rows[0].displayName, '妈妈');

  const orders = await adminApi.main({ token: 'valid-token', action: 'listOrders' });
  assert.deepEqual(orders.orders.map((order) => order._id), ['order-2', 'order-1']);
});

test('adminApi retries order push and updates push fields', async () => {
  const { adminApi, collections } = await loadAdminApi();

  const result = await adminApi.main({
    token: 'valid-token',
    action: 'retryOrderPush',
    payload: { orderId: 'order-1' }
  });

  assert.equal(result.ok, true);
  assert.equal(result.pushStatus, 'skipped');
  assert.equal(collections.orders.rows[0].pushStatus, 'skipped');
  assert.equal(collections.orders.rows[0].pushError, 'PUSH_NOT_CONFIGURED');
  assert.equal(collections.audit_logs.rows.at(-1).action, 'retryPush');
});
