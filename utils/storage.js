const constants = require("./constants");

function readAiConfig() {
  const saved = wx.getStorageSync(constants.STORAGE_KEYS.AI_CONFIG) || {};
  return Object.assign({}, constants.DEFAULT_AI_CONFIG, saved);
}

function saveAiConfig(config) {
  const next = Object.assign({}, constants.DEFAULT_AI_CONFIG, config || {});
  wx.setStorageSync(constants.STORAGE_KEYS.AI_CONFIG, next);
  return next;
}

function readStory() {
  return wx.getStorageSync(constants.STORAGE_KEYS.STORY) || null;
}

function saveStory(story) {
  if (!story) return null;
  const next = Object.assign({}, story, { updatedAt: Date.now() });
  wx.setStorageSync(constants.STORAGE_KEYS.STORY, next);
  return next;
}

function clearStory() {
  wx.removeStorageSync(constants.STORAGE_KEYS.STORY);
}

module.exports = {
  readAiConfig,
  saveAiConfig,
  readStory,
  saveStory,
  clearStory
};
