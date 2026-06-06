const https = require('node:https');
const { formatPushMessage } = require('./domain');

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const request = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => {
        resolve({ statusCode: response.statusCode || 0, data });
      });
    });

    request.on('error', reject);
    request.write(payload);
    request.end();
  });
}

async function sendServerChan(sendKey, order) {
  const cleanSendKey = String(sendKey || '').trim();
  if (!cleanSendKey) {
    return { status: 'skipped', error: 'PUSH_NOT_CONFIGURED' };
  }

  const url = `https://sctapi.ftqq.com/${cleanSendKey}.send`;
  const message = formatPushMessage(order);
  const result = await postJson(url, {
    title: `家里点菜：${order.submitterName}`,
    desp: message
  });

  if (result.statusCode >= 200 && result.statusCode < 300) {
    return { status: 'sent', error: '' };
  }

  return { status: 'failed', error: result.data || `HTTP_${result.statusCode}` };
}

async function sendOrderPush(config, order) {
  if (!config || !config.pushProvider || !config.pushConfig) {
    return { status: 'skipped', error: 'PUSH_NOT_CONFIGURED' };
  }

  if (config.pushProvider === 'server_chan') {
    return sendServerChan(config.pushConfig.sendKey, order);
  }

  return { status: 'failed', error: 'UNSUPPORTED_PUSH_PROVIDER' };
}

module.exports = {
  sendOrderPush
};
