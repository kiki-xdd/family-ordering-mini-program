import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);

const domain = require('../cloudfunctions/shared/domain.js');

const {
  buildOrderItems,
  calculateTotalAmount,
  formatPushMessage,
  mergeSelectedItems
} = domain;

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

test('mergeSelectedItems combines duplicate dishes and rejects empty dish ids', () => {
  assert.deepEqual(mergeSelectedItems([
    { dishId: 'dish-1', quantity: 1, itemNote: '少油' },
    { dishId: 'dish-1', quantity: 2, itemNote: '不要葱' }
  ]), [{
    dishId: 'dish-1',
    quantity: 3,
    itemNote: '少油；不要葱'
  }]);

  assert.throws(() => mergeSelectedItems([
    { dishId: '', quantity: 1 }
  ]), /INVALID_DISH_ID/);
});

test('shapeMenu hides disabled categories and off-shelf dishes', () => {
  const { shapeMenu } = domain;
  const menu = shapeMenu([
    { _id: 'cat-2', name: '汤类', sortOrder: 2, enabled: true },
    { _id: 'cat-1', name: '家常菜', sortOrder: 1, enabled: true },
    { _id: 'cat-3', name: '隐藏', sortOrder: 3, enabled: false }
  ], [
    { _id: 'dish-1', name: '番茄炒蛋', categoryId: 'cat-1', price: '', imageFileId: '', description: '', sortOrder: 2, isOnShelf: true },
    { _id: 'dish-2', name: '下架菜', categoryId: 'cat-1', price: 8, imageFileId: '', description: '', sortOrder: 1, isOnShelf: false }
  ]);

  assert.deepEqual(menu.categories.map((category) => category.name), ['家常菜', '汤类']);
  assert.deepEqual(menu.dishes.map((dish) => dish.name), ['番茄炒蛋']);
  assert.equal(menu.dishes[0].price, null);
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

test('cloud function deploy copies stay in sync with shared domain helper', () => {
  const source = readFileSync(new URL('../cloudfunctions/shared/domain.js', import.meta.url), 'utf8');
  const targets = [
    '../cloudfunctions/getMenu/shared/domain.js',
    '../cloudfunctions/submitOrder/shared/domain.js'
  ];

  for (const target of targets) {
    const copy = readFileSync(new URL(target, import.meta.url), 'utf8');
    assert.equal(copy, source);
  }
});
