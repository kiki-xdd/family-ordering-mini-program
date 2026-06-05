import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const cart = require('../miniprogram/utils/cart.js');

const dish = {
  _id: 'dish-1',
  name: '番茄炒蛋',
  imageFileId: 'cloud://dish-image',
  price: 12
};

test('addDish adds a new item and increments an existing item', () => {
  const added = cart.addDish([], dish);

  assert.deepEqual(added, [{
    dishId: 'dish-1',
    dishName: '番茄炒蛋',
    imageFileId: 'cloud://dish-image',
    price: 12,
    quantity: 1,
    itemNote: ''
  }]);

  const incremented = cart.addDish(added, dish);

  assert.equal(incremented[0].quantity, 2);
});

test('decreaseDish removes an item when quantity reaches zero', () => {
  const items = [{ dishId: 'dish-1', dishName: '番茄炒蛋', quantity: 1 }];

  assert.deepEqual(cart.decreaseDish(items, 'dish-1'), []);
});

test('updateItemNote updates only the matching dish', () => {
  const items = [
    { dishId: 'dish-1', itemNote: '' },
    { dishId: 'dish-2', itemNote: '' }
  ];

  assert.deepEqual(cart.updateItemNote(items, 'dish-2', '少油'), [
    { dishId: 'dish-1', itemNote: '' },
    { dishId: 'dish-2', itemNote: '少油' }
  ]);
});

test('countItems sums item quantities', () => {
  assert.equal(cart.countItems([
    { dishId: 'dish-1', quantity: 2 },
    { dishId: 'dish-2', quantity: 3 }
  ]), 5);
});
