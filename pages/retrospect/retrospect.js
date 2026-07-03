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
        retrospect: narrative.fallbackRetrospect(story),
        loading: false
      });
      return;
    }

    ai.streamChat({
      config,
      messages: prompt.buildRetrospectMessages(story),
      temperature: 0.72,
      onDelta: () => {
        this.setData({ streamText: "回望正在慢慢显影..." });
      }
    }).then((raw) => {
      this.setData({
        retrospect: narrative.parseRetrospect(raw, story),
        loading: false,
        streamText: ""
      });
    }).catch((error) => {
      this.setData({
        retrospect: narrative.fallbackRetrospect(story),
        loading: false,
        streamText: ""
      });
      console.warn("AI retrospect failed, fallback used:", error);
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
