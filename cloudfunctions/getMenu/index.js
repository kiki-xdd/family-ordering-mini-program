const cloud = require('wx-server-sdk');
const { shapeMenu } = require('./shared/domain');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

async function assertMemberAccess(openid) {
  const result = await db.collection('members')
    .where({ openid, enabled: true })
    .limit(1)
    .get();
  if (!result.data[0]) {
    const error = new Error('NO_ACCESS');
    error.code = 'NO_ACCESS';
    throw error;
  }
  return result.data[0];
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  await assertMemberAccess(OPENID);

  const [categoryResult, dishResult] = await Promise.all([
    db.collection('categories').where({ enabled: true }).orderBy('sortOrder', 'asc').get(),
    db.collection('dishes').where({ isOnShelf: true }).orderBy('sortOrder', 'asc').get()
  ]);

  return {
    ok: true,
    menu: shapeMenu(categoryResult.data, dishResult.data)
  };
};
