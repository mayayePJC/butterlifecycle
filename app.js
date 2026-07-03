App({
  onLaunch() {
    wx.setStorageSync("butterfly_last_opened_at", Date.now());
  },

  globalData: {
    productName: "蝴蝶人生"
  }
});
