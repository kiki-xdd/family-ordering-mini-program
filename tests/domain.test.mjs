import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const {
  buildOrderItems,
  calculateTotalAmount,
  formatPushMessage
} = require('../cloudfunctions/shared/domain.js');

test('buildOrderItems snapshots available dishes with quantity and note', () => {
  const dishesById = new Map([
    ['dish-1', {
      _id: 'dish-1',
      name: '番茄炒蛋',
      imageFileId: 'cloud://image',
      price: 12,
      categoryId: 'cat-1',
      isOnShelf: true
    }]
  ]);

  const items = buildOrderItems([
    { dishId: 'dish-1', quantity: 2, itemNote: '少油' }
  ], dishesById);

  assert.deepEqual(JSON.parse(JSON.stringify(items)), [{
    dishId: 'dish-1',
    dishName: '番茄炒蛋',
    imageFileId: 'cloud://image',
    price: 12,
    quantity: 2,
    itemNote: '少油',
    categoryId: 'cat-1'
  }]);
});

test('calculateTotalAmount returns null when any dish has no price', () => {
  assert.equal(calculateTotalAmount([
    { price: 12, quantity: 1 },
    { price: null, quantity: 1 }
  ]), null);
});

test('formatPushMessage includes member, dishes, notes, and total', () => {
  const message = formatPushMessage({
    submitterName: '妈妈',
    createdAt: '2026-06-05 18:30',
    orderNote: '晚上吃',
    totalAmount: 24,
    items: [
      { dishName: '番茄炒蛋', quantity: 2, itemNote: '少油' }
    ]
  });

  assert.match(message, /点菜人：妈妈/);
  assert.match(message, /番茄炒蛋 x2（少油）/);
  assert.match(message, /整单备注：晚上吃/);
  assert.match(message, /合计：¥24.00/);
});
