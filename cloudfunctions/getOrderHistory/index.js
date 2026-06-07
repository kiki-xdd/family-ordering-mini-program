const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

async function assertMember(openid) {
  const result = await db.collection('members')
    .where({ openid, enabled: true })
    .limit(1)
    .get();

  if (!result.data[0]) {
    const error = new Error('NO_ACCESS');
    error.code = 'NO_ACCESS';
    throw error;
  }
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  await assertMember(OPENID);

  const scope = event.scope === 'family' ? 'family' : 'mine';
  let query = db.collection('orders');
  if (scope === 'mine') {
    query = query.where({ submitterOpenid: OPENID });
  }

  const result = await query
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  return {
    ok: true,
    scope,
    orders: result.data
  };
};
