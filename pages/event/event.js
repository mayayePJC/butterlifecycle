const narrative = require("../../utils/narrative");
const storage = require("../../utils/storage");

Page({
  data: {
    character: null,
    event: null,
    customText: ""
  },

  onLoad() {
    const character = wx.getStorageSync("butterfly_selected_character");
    if (!character) {
      wx.redirectTo({ url: "/pages/character/character" });
      return;
    }
    this.setData({
      character,
      event: narrative.pickEvent(character)
    });
  },

  nextEvent() {
    this.setData({ event: narrative.pickEvent(this.data.character) });
  },

  onCustomInput(event) {
    this.setData({ customText: event.detail.value });
  },

  useCustom() {
    this.setData({ event: narrative.createEventFromText(this.data.customText) });
    wx.showToast({ title: "已放入起点", icon: "none" });
  },

  startStory() {
    const story = narrative.buildInitialStory(this.data.character, this.data.event);
    storage.saveStory(story);
    wx.redirectTo({ url: "/pages/story/story" });
  },

  back() {
    wx.navigateBack();
  },

  goSettings() {
    wx.navigateTo({ url: "/pages/settings/settings" });
  }
});
