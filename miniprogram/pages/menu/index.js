const api = require('../../utils/api');
const cart = require('../../utils/cart');

function getVisibleDishes(dishes, activeCategoryId, selectedItems) {
  const quantitiesByDishId = selectedItems.reduce((quantities, item) => {
    quantities[item.dishId] = item.quantity;
    return quantities;
  }, {});

  return dishes
    .filter((dish) => dish.categoryId === activeCategoryId)
    .map((dish) => ({
      ...dish,
      hasPrice: dish.price !== null && dish.price !== undefined,
      selectedQuantity: quantitiesByDishId[dish._id] || 0
    }));
}

function getVisibleCategories(categories, activeCategoryId) {
  return categories.map((category) => ({
    ...category,
    className: category._id === activeCategoryId ? 'category-item active' : 'category-item'
  }));
}

Page({
  data: {
    loading: true,
    categories: [],
    dishes: [],
    visibleDishes: [],
    activeCategoryId: '',
    selectedItems: [],
    selectedCount: 0,
    hasVisibleDishes: false,
    submitButtonClass: 'submit-button disabled'
  },

  async onLoad() {
    try {
      const access = await api.checkMemberAccess();
      if (!access || !access.allowed) {
        wx.redirectTo({ url: '/pages/no-access/index' });
        return;
      }

      const result = await api.getMenu();
      const menu = result && result.menu ? result.menu : { categories: [], dishes: [] };
      const categories = menu.categories || [];
      const dishes = menu.dishes || [];
      const activeCategoryId = categories[0] ? categories[0]._id : '';

      this.setData({
        loading: false,
        categories: getVisibleCategories(categories, activeCategoryId),
        dishes,
        activeCategoryId,
        visibleDishes: getVisibleDishes(dishes, activeCategoryId, this.data.selectedItems),
        hasVisibleDishes: Boolean(dishes.some((dish) => dish.categoryId === activeCategoryId))
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({
        title: '菜单加载失败',
        icon: 'none'
      });
    }
  },

  selectCategory(event) {
    const activeCategoryId = event.currentTarget.dataset.id;
    this.setData({
      activeCategoryId,
      categories: getVisibleCategories(this.data.categories, activeCategoryId),
      visibleDishes: getVisibleDishes(
        this.data.dishes,
        activeCategoryId,
        this.data.selectedItems
      ),
      hasVisibleDishes: Boolean(this.data.dishes.some((dish) => dish.categoryId === activeCategoryId))
    });
  },

  addDish(event) {
    const dishId = event.currentTarget.dataset.id;
    const dish = this.data.dishes.find((item) => item._id === dishId);
    if (!dish) return;

    this.updateSelectedItems(cart.addDish(this.data.selectedItems, dish));
  },

  decreaseDish(event) {
    const dishId = event.currentTarget.dataset.id;
    this.updateSelectedItems(cart.decreaseDish(this.data.selectedItems, dishId));
  },

  updateSelectedItems(selectedItems) {
    const selectedCount = cart.countItems(selectedItems);
    const visibleDishes = getVisibleDishes(
      this.data.dishes,
      this.data.activeCategoryId,
      selectedItems
    );

    this.setData({
      selectedItems,
      selectedCount,
      visibleDishes,
      hasVisibleDishes: Boolean(visibleDishes.length),
      submitButtonClass: selectedCount ? 'submit-button' : 'submit-button disabled'
    });
  },

  openConfirm() {
    if (!this.data.selectedItems.length) return;

    wx.setStorageSync('selectedItems', this.data.selectedItems);
    wx.navigateTo({ url: '/pages/confirm/index' });
  }
});
