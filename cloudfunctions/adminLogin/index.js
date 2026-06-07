const cloud = require('wx-server-sdk');
const {
  verifyPassword,
  createSession,
  isLoginLocked,
  nextFailedLoginState,
  resetFailedLoginState
} = require('./shared/adminAuth');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

async function getAttemptRecord(openid) {
  const result = await db.collection('admin_login_attempts')
    .where({ openid })
    .limit(1)
    .get();

  return result.data[0] || null;
}

async function saveAttemptRecord(openid, attemptRecord, data) {
  if (attemptRecord) {
    await db.collection('admin_login_attempts').doc(attemptRecord._id).update({ data });
    return;
  }

  await db.collection('admin_login_attempts').add({
    data: {
      openid,
      ...data,
      createdAt: new Date().toISOString()
    }
  });
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext();
  const password = String(event.password || '');
  const attemptRecord = await getAttemptRecord(OPENID);

  if (isLoginLocked(attemptRecord)) {
    throw new Error('ADMIN_LOGIN_LOCKED');
  }

  const configResult = await db.collection('admin_config').limit(1).get();
  const config = configResult.data[0];

  if (!config || !verifyPassword(password, config.adminPasswordHash, config.adminPasswordSalt)) {
    await saveAttemptRecord(OPENID, attemptRecord, nextFailedLoginState(attemptRecord));
    throw new Error('INVALID_ADMIN_PASSWORD');
  }

  await saveAttemptRecord(OPENID, attemptRecord, resetFailedLoginState());

  const session = createSession(OPENID);
  await db.collection('admin_sessions').add({
    data: {
      token: session.token,
      openid: OPENID,
      expiresAt: session.expiresAt,
      createdAt: new Date().toISOString()
    }
  });

  return { ok: true, token: session.token, expiresAt: session.expiresAt };
};
