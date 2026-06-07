const api = require('../../utils/api');
const cart = require('../../utils/cart');

function shapeItems(items) {
  return items.map((item) => ({
    ...item,
    hasPrice: item.price !== null && item.price !== undefined
  }));
}

function calculateTotalAmount(items) {
  if (items.some((item) => item.price === null || item.price === undefined)) return null;
  const cents = items.reduce((sum, item) => {
    return sum + Math.round(Number(item.price) * 100) * item.quantity;
  }, 0);
  return cents / 100;
}

Page({
  data: {
    items: [],
    orderNote: '',
    totalAmount: null,
    hasTotalAmount: false,
    hasItems: false,
    submitButtonClass: 'submit-button disabled',
    submitting: false
  },

  onLoad() {
    const selectedItems = wx.getStorageSync('selectedItems') || [];
    const items = shapeItems(Array.isArray(selectedItems) ? selectedItems : []);
    const totalAmount = calculateTotalAmount(items);

    this.setData({
      items,
      totalAmount,
      hasTotalAmount: totalAmount !== null,
      hasItems: Boolean(items.length),
      submitButtonClass: items.length ? 'submit-button' : 'submit-button disabled'
    });
  },

  updateOrderNote(event) {
    this.setData({ orderNote: event.detail.value });
  },

  updateItemNote(event) {
    const dishId = event.currentTarget.dataset.id;
    const items = cart.updateItemNote(this.data.items, dishId, event.detail.value);
    this.setData({ items });
  },

  async submit() {
    if (this.data.submitting) return;
    if (!this.data.items.length) {
      wx.showToast({
        title: '还没有选择菜品',
        icon: 'none'
      });
      return;
    }

    this.setData({
      submitting: true,
      submitButtonClass: 'submit-button disabled'
    });
    try {
      const result = await api.submitOrder({
        items: this.data.items,
        orderNote: this.data.orderNote
      });

      if (!result || !result.ok) {
        throw new Error('SUBMIT_FAILED');
      }

      wx.removeStorageSync('selectedItems');
      wx.showToast({
        title: '已提交',
        icon: 'success'
      });
      wx.redirectTo({ url: '/pages/history/index' });
    } catch (error) {
      this.setData({
        submitting: false,
        submitButtonClass: 'submit-button'
      });
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      });
    }
  }
});
