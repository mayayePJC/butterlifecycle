const storage = require("../../utils/storage");
const narrative = require("../../utils/narrative");
const prompt = require("../../utils/prompt");
const ai = require("../../utils/ai");

const AI_STORY_TIMEOUT_MS = 75000;

Page({
  data: {
    story: null,
    beats: [],
    choices: [],
    customAction: "",
    streaming: false,
    streamText: "",
    scrollIntoView: ""
  },

  onLoad() {
    const story = storage.readStory();
    if (!story) {
      wx.redirectTo({ url: "/pages/character/character" });
      return;
    }
    this.refresh(story);
  },

  refresh(story) {
    const last = story.beats[story.beats.length - 1];
    const target = story.beats.length > 1 ? "beat-" + last.turn : "story-bottom";
    this.setData({
      story,
      beats: story.beats.map(function (beat) {
        return Object.assign({}, beat, {
          turnText: ("0" + beat.turn).slice(-2) + "."
        });
      }),
      choices: last.choices || [],
      scrollIntoView: target
    });
  },

  chooseOption(event) {
    const index = Number(event.currentTarget.dataset.index);
    const action = this.data.choices[index];
    this.generateNext(action);
  },

  onCustomInput(event) {
    this.setData({ customAction: event.detail.value });
  },

  sendCustom() {
    const text = (this.data.customAction || "").trim();
    if (!text) return;
    this.generateNext({ tag: "自定义行动", text });
  },

  generateNext(action) {
    if (this.data.streaming) return;
    const story = this.data.story;
    const config = storage.readAiConfig();
    let finished = false;
    let fallbackTimer = null;

    const finishWithBeat = (beat) => {
      if (finished) return;
      finished = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      const next = narrative.appendBeat(story, action, beat);
      storage.saveStory(next);
      this.setData({ streaming: false, streamText: "" });
      this.refresh(next);
    };

    const finishWithFallback = (message) => {
      const beat = narrative.fallbackTurn(story, action);
      finishWithBeat(beat);
      if (message) {
        wx.showToast({
          title: message,
          icon: "none"
        });
      }
    };

    this.setData({
      streaming: true,
      streamText: "AI 正在续写，这一段可能需要几十秒...",
      customAction: "",
      scrollIntoView: "streaming"
    });

    if (!config.enabled || !config.proxyUrl) {
      setTimeout(() => {
        finishWithFallback("");
      }, 360);
      return;
    }

    fallbackTimer = setTimeout(() => {
      finishWithFallback("AI 太久未返回，已用本地剧情");
    }, AI_STORY_TIMEOUT_MS + 5000);

    ai.requestChat({
      config,
      messages: prompt.buildTurnMessages(story, action),
      maxTokens: 1200,
      timeout: AI_STORY_TIMEOUT_MS
    }).then((raw) => {
      const beat = narrative.parseTurn(raw, story, action);
      finishWithBeat(beat);
    }).catch((error) => {
      finishWithFallback(ai.describeError(error).slice(0, 18) || "AI 失败，已用本地剧情");
      console.warn("AI story failed, fallback used:", error);
      console.warn("AI error detail:", ai.describeError(error));
    });
  },

  finishStory() {
    if (this.data.streaming) return;
    wx.navigateTo({ url: "/pages/retrospect/retrospect" });
  },

  goHome() {
    wx.redirectTo({ url: "/pages/character/character" });
  },

  goSettings() {
    wx.navigateTo({ url: "/pages/settings/settings" });
  }
});
