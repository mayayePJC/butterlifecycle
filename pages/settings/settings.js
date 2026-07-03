const storage = require("../../utils/storage");

Page({
  data: {
    config: {},
    pendingKey: "",
    keyPlaceholder: "sk-..."
  },

  onLoad() {
    const config = storage.readAiConfig();
    this.setData({
      config,
      pendingKey: "",
      keyPlaceholder: config.apiKey ? "已保存 API Key，留空不覆盖" : "sk-..."
    });
  },

  onEnabledChange(event) {
    this.setData({ "config.enabled": event.detail.value });
  },

  onEndpointInput(event) {
    this.setData({ "config.endpoint": event.detail.value });
  },

  onModelInput(event) {
    this.setData({ "config.model": event.detail.value });
  },

  onApiKeyInput(event) {
    this.setData({
      pendingKey: event.detail.value
    });
  },

  save() {
    const config = Object.assign({}, this.data.config);
    if ((this.data.pendingKey || "").trim()) {
      config.apiKey = this.data.pendingKey.trim();
    }
    storage.saveAiConfig(config);
    this.setData({
      config,
      pendingKey: "",
      keyPlaceholder: config.apiKey ? "已保存 API Key，留空不覆盖" : "sk-..."
    });
    wx.showToast({ title: "已保存", icon: "success" });
  },

  clearKey() {
    const config = Object.assign({}, this.data.config, { apiKey: "", enabled: false });
    storage.saveAiConfig(config);
    this.setData({
      config,
      pendingKey: "",
      keyPlaceholder: "sk-..."
    });
    wx.showToast({ title: "已清除", icon: "none" });
  },

  back() {
    wx.navigateBack();
  },

  noop() {}
});
