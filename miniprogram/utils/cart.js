function addDish(items, dish) {
  const existing = items.find((item) => item.dishId === dish._id);

  if (existing) {
    return items.map((item) => (
      item.dishId === dish._id
        ? { ...item, quantity: item.quantity + 1 }
        : item
    ));
  }

  return items.concat({
    dishId: dish._id,
    dishName: dish.name,
    imageFileId: dish.imageFileId,
    price: dish.price,
    quantity: 1,
    itemNote: ''
  });
}

function decreaseDish(items, dishId) {
  return items.reduce((nextItems, item) => {
    if (item.dishId !== dishId) {
      nextItems.push(item);
      return nextItems;
    }

    const quantity = item.quantity - 1;
    if (quantity > 0) {
      nextItems.push({ ...item, quantity });
    }

    return nextItems;
  }, []);
}

function updateItemNote(items, dishId, itemNote) {
  return items.map((item) => (
    item.dishId === dishId
      ? { ...item, itemNote }
      : item
  ));
}

function countItems(items) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

module.exports = {
  addDish,
  decreaseDish,
  updateItemNote,
  countItems
};
