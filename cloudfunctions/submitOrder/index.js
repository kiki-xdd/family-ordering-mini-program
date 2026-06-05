const cloud = require('wx-server-sdk');
const {
  buildOrderItems,
  calculateTotalAmount,
  formatPushMessage,
  mergeSelectedItems
} = require('./shared/domain');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

async function getMember(openid) {
  const result = await db.collection('members')
    .where({ openid, enabled: true })
    .limit(1)
    .get();

  const member = result.data[0];
  if (!member) {
    const error = new Error('NO_ACCESS');
    error.code = 'NO_ACCESS';
    throw error;
  }
  return member;
}

function getDisplayName(member) {
  return member.displayName || member.name || member.nickname || '家庭成员';
}

function hasPushConfig(config) {
  if (!config || !config.pushProvider || !config.pushConfig) return false;
  if (config.pushProvider === 'server_chan') {
    return Boolean(config.pushConfig.sendKey);
  }
  if (config.pushProvider === 'webhook') {
    return Boolean(config.pushConfig.webhookUrl);
  }
  return false;
}

async function sendPush(order) {
  const result = await db.collection('admin_config')
    .limit(1)
    .get();
  const config = result.data[0];

  if (!hasPushConfig(config)) {
    return {
      status: 'skipped',
      error: 'PUSH_NOT_CONFIGURED'
    };
  }

  return {
    status: 'pending_provider',
    error: '',
    message: formatPushMessage(order)
  };
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const member = await getMember(OPENID);
  const selectedItems = Array.isArray(event.items) ? event.items : [];

  if (!selectedItems.length) {
    const error = new Error('EMPTY_ORDER');
    error.code = 'EMPTY_ORDER';
    throw error;
  }

  const mergedSelectedItems = mergeSelectedItems(selectedItems);
  const dishIds = mergedSelectedItems.map((item) => item.dishId);
  const dishResult = await db.collection('dishes')
    .where({
      _id: _.in(dishIds),
      isOnShelf: true
    })
    .get();
  const dishesById = new Map(dishResult.data.map((dish) => [dish._id, dish]));
  const items = buildOrderItems(mergedSelectedItems, dishesById);
  const now = new Date().toISOString();
  const order = {
    submitterOpenid: OPENID,
    submitterName: getDisplayName(member),
    items,
    orderNote: String(event.orderNote || '').trim(),
    totalAmount: calculateTotalAmount(items),
    pushStatus: 'pending',
    pushError: '',
    createdAt: now
  };

  const addResult = await db.collection('orders').add({ data: order });
  const orderId = addResult._id;

  try {
    const pushResult = await sendPush(order);
    await db.collection('orders').doc(orderId).update({
      data: {
        pushStatus: pushResult.status,
        pushError: pushResult.error || ''
      }
    });

    return {
      ok: true,
      orderId,
      pushStatus: pushResult.status
    };
  } catch (error) {
    await db.collection('orders').doc(orderId).update({
      data: {
        pushStatus: 'failed',
        pushError: error.message
      }
    });

    return {
      ok: true,
      orderId,
      pushStatus: 'failed'
    };
  }
};
