function callFunction(name, data = {}) {
  return wx.cloud.callFunction({ name, data })
    .then((response) => response.result);
}

module.exports = {
  checkMemberAccess: () => callFunction('checkMemberAccess'),
  getMenu: () => callFunction('getMenu'),
  submitOrder: (payload) => callFunction('submitOrder', payload),
  getOrderHistory: (payload) => callFunction('getOrderHistory', payload)
};
