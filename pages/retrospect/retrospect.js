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
    if (!config.enabled || !config.apiKey) {
      this.setData({
        retrospect: narrative.fallbackRetrospect(story),
        loading: false
      });
      return;
    }

    ai.streamChat({
      config,
      messages: prompt.buildRetrospectMessages(story),
      temperature: 0.72,
      onDelta: (delta, fullText) => {
        this.setData({ streamText: fullText });
      }
    }).then((raw) => {
      this.setData({
        retrospect: narrative.parseRetrospect(raw, story),
        loading: false,
        streamText: ""
      });
    }).catch(() => {
      this.setData({
        retrospect: narrative.fallbackRetrospect(story),
        loading: false,
        streamText: ""
      });
      wx.showToast({ title: "AI 失败，已用本地回望", icon: "none" });
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
