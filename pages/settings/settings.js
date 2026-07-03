const storage = require("../../utils/storage");

Page({
  data: {
    config: {}
  },

  onLoad() {
    const config = storage.readAiConfig();
    this.setData({
      config
    });
  },

  onEnabledChange(event) {
    this.setData({ "config.enabled": event.detail.value });
  },

  onProxyUrlInput(event) {
    this.setData({ "config.proxyUrl": event.detail.value.trim() });
  },

  save() {
    const config = Object.assign({}, this.data.config);
    storage.saveAiConfig(config);
    this.setData({
      config
    });
    wx.showToast({ title: "已保存", icon: "success" });
  },

  disableAi() {
    const config = Object.assign({}, this.data.config, { enabled: false });
    storage.saveAiConfig(config);
    this.setData({
      config
    });
    wx.showToast({ title: "已关闭 AI", icon: "none" });
  },

  back() {
    wx.navigateBack();
  },

  noop() {}
});
