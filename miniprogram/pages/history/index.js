const api = require('../../utils/api');

function formatCreatedAt(createdAt) {
  if (!createdAt) return '';
  return String(createdAt).replace('T', ' ').slice(0, 16);
}

function shapeOrders(orders) {
  return orders.map((order) => ({
    ...order,
    createdAtText: formatCreatedAt(order.createdAt),
    hasOrderNote: Boolean(order.orderNote),
    hasTotalAmount: order.totalAmount !== null && order.totalAmount !== undefined,
    items: (order.items || []).map((item) => ({
      ...item,
      hasItemNote: Boolean(item.itemNote)
    }))
  }));
}

Page({
  data: {
    scope: 'mine',
    orders: [],
    loading: true,
    hasOrders: false,
    showEmpty: false,
    isMineScope: true,
    isFamilyScope: false,
    mineTabClass: 'tab active',
    familyTabClass: 'tab'
  },

  onShow() {
    this.loadOrders();
  },

  switchScope(event) {
    const scope = event.currentTarget.dataset.scope === 'family' ? 'family' : 'mine';
    if (scope === this.data.scope) return;

    this.setData({
      scope,
      isMineScope: scope === 'mine',
      isFamilyScope: scope === 'family',
      mineTabClass: scope === 'mine' ? 'tab active' : 'tab',
      familyTabClass: scope === 'family' ? 'tab active' : 'tab'
    });
    this.loadOrders();
  },

  async loadOrders() {
    this.setData({
      loading: true,
      showEmpty: false
    });
    try {
      const result = await api.getOrderHistory({ scope: this.data.scope });
      const orders = shapeOrders(result && result.orders ? result.orders : []);
      this.setData({
        orders,
        loading: false,
        hasOrders: Boolean(orders.length),
        showEmpty: !orders.length
      });
    } catch (error) {
      this.setData({
        orders: [],
        loading: false,
        hasOrders: false,
        showEmpty: true
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  }
});
