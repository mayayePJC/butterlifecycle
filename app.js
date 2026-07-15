App({
  onLaunch() {
    wx.setStorageSync("butterfly_last_opened_at", Date.now());
  },

  globalData: {
    productName: "butterlife"
  }
});
