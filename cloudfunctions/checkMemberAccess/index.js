const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const result = await db.collection('members')
    .where({ openid: OPENID, enabled: true })
    .limit(1)
    .get();

  const member = result.data[0];
  return {
    allowed: Boolean(member),
    openid: OPENID,
    member: member ? {
      _id: member._id,
      displayName: member.displayName
    } : null
  };
};
