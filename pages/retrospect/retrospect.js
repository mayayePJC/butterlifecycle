const storage = require("../../utils/storage");
const narrative = require("../../utils/narrative");
const prompt = require("../../utils/prompt");
const ai = require("../../utils/ai");

Page({
  data: {
    story: null,
    retrospect: null,
    loading: true,
    streamText: ""
  },

  onLoad() {
    const story = storage.readStory();
    if (!story) {
      wx.redirectTo({ url: "/pages/character/character" });
      return;
    }
    this.setData({ story });
    this.generate(story);
  },

  generate(story) {
    const config = storage.readAiConfig();
    if (!config.enabled || !config.proxyUrl) {
      this.setData({
        loading: false
      });
      wx.showModal({
        title: "AI 回望失败",
        content: "AI 未启用或缺少云端代理地址。",
        showCancel: false
      });
      return;
    }

    ai.requestChat({
      config,
      messages: prompt.buildRetrospectMessages(story),
      temperature: 0.72,
      maxTokens: 700,
      timeout: 75000
    }).then((raw) => {
      const retrospect = narrative.parseRetrospect(raw, story);
      if (!retrospect) {
        throw new Error("AI 回望格式不完整，没有生成回望。");
      }
      this.setData({
        retrospect,
        loading: false,
        streamText: ""
      });
    }).catch((error) => {
      this.setData({
        loading: false,
        streamText: ""
      });
      wx.showModal({
        title: "AI 回望失败",
        content: ai.describeError(error),
        showCancel: false
      });
      console.warn("AI retrospect failed:", error);
      console.warn("AI error detail:", ai.describeError(error));
    });
  },

  restart() {
    storage.clearStory();
    wx.removeStorageSync("butterfly_selected_character");
    wx.redirectTo({ url: "/pages/character/character" });
  },

  backStory() {
    wx.navigateBack();
  },

  goSettings() {
    wx.navigateTo({ url: "/pages/settings/settings" });
  },

  onShareAppMessage() {
    return {
      title: "蝴蝶人生：一段人生的切片",
      path: "/pages/character/character"
    };
  }
});
