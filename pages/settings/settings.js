const storage = require("../../utils/storage");
const ai = require("../../utils/ai");

function isCloudHostingTestDomain(url) {
  return /\/\/[^/]*(tcloudbase\.com|apigw\.tencentcs\.com)/i.test(url || "");
}

Page({
  data: {
    config: {},
    testing: false
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
    if (isCloudHostingTestDomain(config.proxyUrl)) {
      wx.showModal({
        title: "测试域名提醒",
        content: "云托管默认域名只适合调试。正式发布前请在云托管绑定自定义 HTTPS 域名，并把该域名加入小程序 request 合法域名。",
        showCancel: false
      });
      return;
    }
    wx.showToast({ title: "已保存", icon: "success" });
  },

  testAi() {
    if (this.data.testing) return;
    const config = storage.saveAiConfig(this.data.config);
    this.setData({
      config,
      testing: true
    });

    if (!config.enabled || !config.proxyUrl) {
      this.setData({ testing: false });
      wx.showToast({ title: "请先启用 AI 并填写 URL", icon: "none" });
      return;
    }

    if (isCloudHostingTestDomain(config.proxyUrl)) {
      wx.showModal({
        title: "当前是测试域名",
        content: "可以继续在开发工具里测试。正式版请改用云托管绑定的自定义 HTTPS 域名。",
        showCancel: false
      });
    }

    wx.showLoading({ title: "测试中" });
    ai.testConnection(config).then(() => {
      wx.hideLoading();
      this.setData({ testing: false });
      wx.showToast({ title: "AI 连接正常", icon: "success" });
    }).catch((error) => {
      wx.hideLoading();
      this.setData({ testing: false });
      wx.showModal({
        title: "AI 连接失败",
        content: ai.describeError(error),
        showCancel: false
      });
    });
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
