const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

function nowIso() {
  return new Date().toISOString();
}

function text(value) {
  return String(value || '').trim();
}

function numberOrZero(value) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizePrice(price) {
  if (price === undefined || price === null || price === '') return null;
  const value = Number(price);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('INVALID_PRICE');
  }
  return Math.round(value * 100) / 100;
}

async function assertAdmin(token) {
  const cleanToken = text(token);
  if (!cleanToken) {
    throw new Error('ADMIN_SESSION_EXPIRED');
  }

  const result = await db.collection('admin_sessions')
    .where({ token: cleanToken })
    .limit(1)
    .get();
  const session = result.data[0];

  if (!session || session.expiresAt <= Date.now()) {
    throw new Error('ADMIN_SESSION_EXPIRED');
  }

  return session;
}

async function log(action, targetType, targetId, summary) {
  await db.collection('audit_logs').add({
    data: {
      actor: 'admin',
      action,
      targetType,
      targetId,
      summary,
      createdAt: nowIso()
    }
  });
}

async function listCategories() {
  const result = await db.collection('categories').orderBy('sortOrder', 'asc').get();
  return { ok: true, categories: result.data };
}

async function saveCategory(payload) {
  const data = {
    name: text(payload.name),
    sortOrder: numberOrZero(payload.sortOrder),
    enabled: payload.enabled !== false,
    updatedAt: nowIso()
  };

  if (!data.name) throw new Error('CATEGORY_NAME_REQUIRED');

  if (payload._id) {
    const id = text(payload._id);
    await db.collection('categories').doc(id).update({ data });
    await log('update', 'category', id, data.name);
    return { ok: true, _id: id };
  }

  const result = await db.collection('categories').add({
    data: {
      ...data,
      createdAt: nowIso()
    }
  });
  await log('create', 'category', result._id, data.name);
  return { ok: true, _id: result._id };
}

async function listDishes() {
  const result = await db.collection('dishes').orderBy('sortOrder', 'asc').get();
  return { ok: true, dishes: result.data };
}

async function saveDish(payload) {
  const data = {
    name: text(payload.name),
    categoryId: text(payload.categoryId),
    imageFileId: text(payload.imageFileId),
    price: normalizePrice(payload.price),
    description: text(payload.description),
    sortOrder: numberOrZero(payload.sortOrder),
    isOnShelf: payload.isOnShelf !== false,
    updatedAt: nowIso()
  };

  if (!data.name) throw new Error('DISH_NAME_REQUIRED');
  if (!data.categoryId) throw new Error('DISH_CATEGORY_REQUIRED');
  if (!data.imageFileId) throw new Error('DISH_IMAGE_REQUIRED');

  if (payload._id) {
    const id = text(payload._id);
    await db.collection('dishes').doc(id).update({ data });
    await log('update', 'dish', id, data.name);
    return { ok: true, _id: id };
  }

  const result = await db.collection('dishes').add({
    data: {
      ...data,
      createdAt: nowIso()
    }
  });
  await log('create', 'dish', result._id, data.name);
  return { ok: true, _id: result._id };
}

async function listMembers() {
  const result = await db.collection('members').orderBy('createdAt', 'desc').get();
  return { ok: true, members: result.data };
}

async function saveMember(payload) {
  const data = {
    openid: text(payload.openid),
    displayName: text(payload.displayName),
    enabled: payload.enabled !== false,
    updatedAt: nowIso()
  };

  if (!data.openid) throw new Error('MEMBER_OPENID_REQUIRED');
  if (!data.displayName) throw new Error('MEMBER_NAME_REQUIRED');

  if (payload._id) {
    const id = text(payload._id);
    await db.collection('members').doc(id).update({ data });
    await log('update', 'member', id, data.displayName);
    return { ok: true, _id: id };
  }

  const result = await db.collection('members').add({
    data: {
      ...data,
      createdAt: nowIso()
    }
  });
  await log('create', 'member', result._id, data.displayName);
  return { ok: true, _id: result._id };
}

async function listOrders() {
  const result = await db.collection('orders').orderBy('createdAt', 'desc').limit(100).get();
  return { ok: true, orders: result.data };
}

const actions = {
  listCategories,
  saveCategory,
  listDishes,
  saveDish,
  listMembers,
  saveMember,
  listOrders
};

exports.main = async (event = {}) => {
  await assertAdmin(event.token);

  const action = actions[event.action];
  if (!action) {
    throw new Error('UNKNOWN_ADMIN_ACTION');
  }

  return action(event.payload || {});
};
