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

    const finishWithBeat = (beat) => {
      if (finished) return;
      finished = true;
      const next = narrative.appendBeat(story, action, beat);
      storage.saveStory(next);
      this.setData({ streaming: false, streamText: "" });
      this.refresh(next);
    };

    const failWithAiError = (message) => {
      if (finished) return;
      finished = true;
      this.setData({ streaming: false, streamText: "" });
      wx.showModal({
        title: "AI 生成失败",
        content: message || "AI 没有成功返回下一回合，请检查代理、Key 或模型输出。",
        showCancel: false
      });
    };

    this.setData({
      streaming: true,
      streamText: "AI 正在续写，这一段可能需要几十秒...",
      customAction: "",
      scrollIntoView: "streaming"
    });

    if (!config.enabled || !config.proxyUrl) {
      failWithAiError("AI 未启用或缺少云端代理地址。");
      return;
    }

    ai.requestChat({
      config,
      messages: prompt.buildTurnMessages(story, action),
      maxTokens: 2600,
      temperature: 0.82,
      topP: 0.96,
      timeout: AI_STORY_TIMEOUT_MS,
      jsonMode: true
    }).then((raw) => {
      const beat = narrative.parseTurn(raw, story, action);
      if (!beat) {
        throw new Error(narrative.describeTurnParseFailure(raw));
      }
      finishWithBeat(beat);
    }).catch((error) => {
      failWithAiError(ai.describeError(error));
      console.warn("AI story failed:", error);
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
