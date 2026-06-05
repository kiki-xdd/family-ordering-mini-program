function normalizePrice(price) {
  if (price === undefined || price === null || price === '') return null;
  const value = Number(price);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('INVALID_PRICE');
  }
  return Math.round(value * 100) / 100;
}

function normalizeQuantity(quantity) {
  const value = Number(quantity);
  if (!Number.isInteger(value) || value < 1 || value > 99) {
    throw new Error('INVALID_QUANTITY');
  }
  return value;
}

function buildOrderItems(selectedItems, dishesById) {
  return selectedItems.map((item) => {
    const dish = dishesById.get(item.dishId);
    if (!dish || !dish.isOnShelf) {
      throw new Error('DISH_UNAVAILABLE');
    }
    return {
      dishId: dish._id,
      dishName: dish.name,
      imageFileId: dish.imageFileId || '',
      price: normalizePrice(dish.price),
      quantity: normalizeQuantity(item.quantity),
      itemNote: String(item.itemNote || '').trim(),
      categoryId: dish.categoryId
    };
  });
}

function calculateTotalAmount(items) {
  const hasUnpricedItem = items.some((item) => item.price === null);
  if (hasUnpricedItem) return null;
  const cents = items.reduce((sum, item) => {
    return sum + Math.round(item.price * 100) * item.quantity;
  }, 0);
  return cents / 100;
}

function formatPushMessage(order) {
  const lines = [
    `点菜人：${order.submitterName}`,
    `时间：${order.createdAt}`,
    '菜品：'
  ];
  for (const item of order.items) {
    const note = item.itemNote ? `（${item.itemNote}）` : '';
    lines.push(`- ${item.dishName} x${item.quantity}${note}`);
  }
  if (order.orderNote) lines.push(`整单备注：${order.orderNote}`);
  if (order.totalAmount !== null && order.totalAmount !== undefined) {
    lines.push(`合计：¥${order.totalAmount.toFixed(2)}`);
  }
  return lines.join('\n');
}

module.exports = {
  normalizePrice,
  normalizeQuantity,
  buildOrderItems,
  calculateTotalAmount,
  formatPushMessage
};
