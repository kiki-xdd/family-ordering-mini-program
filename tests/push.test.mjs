import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const https = require('node:https');
const { sendOrderPush } = require('../cloudfunctions/shared/push.js');

const order = {
  submitterName: '妈妈',
  createdAt: '2026-06-06T10:00:00.000Z',
  orderNote: '晚上吃',
  totalAmount: 24,
  items: [
    { dishName: '番茄炒蛋', quantity: 2, itemNote: '少油' }
  ]
};

test('sendOrderPush skips when push config is missing', async () => {
  assert.deepEqual(await sendOrderPush(null, order), {
    status: 'skipped',
    error: 'PUSH_NOT_CONFIGURED'
  });
});

test('sendOrderPush rejects unsupported providers', async () => {
  assert.deepEqual(await sendOrderPush({
    pushProvider: 'unknown',
    pushConfig: {}
  }, order), {
    status: 'failed',
    error: 'UNSUPPORTED_PUSH_PROVIDER'
  });
});

test('sendOrderPush sends Server Chan JSON payload', async () => {
  const originalRequest = https.request;
  let requestedUrl = '';
  let postedPayload = '';

  https.request = function fakeRequest(url, options, callback) {
    requestedUrl = String(url);
    assert.equal(options.method, 'POST');

    const response = new EventEmitter();
    response.statusCode = 200;
    const request = new EventEmitter();
    request.write = (chunk) => {
      postedPayload += chunk;
    };
    request.end = () => {
      callback(response);
      response.emit('data', '{"code":0}');
      response.emit('end');
    };
    return request;
  };

  try {
    const result = await sendOrderPush({
      pushProvider: 'server_chan',
      pushConfig: { sendKey: 'send-key' }
    }, order);

    assert.deepEqual(result, { status: 'sent', error: '' });
    assert.equal(requestedUrl, 'https://sctapi.ftqq.com/send-key.send');
    const body = JSON.parse(postedPayload);
    assert.equal(body.title, '家里点菜：妈妈');
    assert.match(body.desp, /番茄炒蛋 x2（少油）/);
  } finally {
    https.request = originalRequest;
  }
});
