const storage = require("../../utils/storage");
const narrative = require("../../utils/narrative");
const prompt = require("../../utils/prompt");
const ai = require("../../utils/ai");

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
    this.setData({
      story,
      beats: story.beats.map(function (beat) {
        return Object.assign({}, beat, {
          turnText: ("0" + beat.turn).slice(-2) + "."
        });
      }),
      choices: last.choices || [],
      scrollIntoView: "story-bottom"
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
    this.setData({
      streaming: true,
      streamText: "",
      customAction: "",
      scrollIntoView: "streaming"
    });

    if (!config.enabled || !config.proxyUrl) {
      setTimeout(() => {
        const beat = narrative.fallbackTurn(story, action);
        const next = narrative.appendBeat(story, action, beat);
        storage.saveStory(next);
        this.setData({ streaming: false, streamText: "" });
        this.refresh(next);
      }, 360);
      return;
    }

    ai.streamChat({
      config,
      messages: prompt.buildTurnMessages(story, action),
      onDelta: () => {
        this.setData({
          streamText: "她的下一段人生正在浮现...",
          scrollIntoView: "streaming"
        });
      }
    }).then((raw) => {
      const beat = narrative.parseTurn(raw, story);
      const next = narrative.appendBeat(story, action, beat);
      storage.saveStory(next);
      this.setData({ streaming: false, streamText: "" });
      this.refresh(next);
    }).catch((error) => {
      const beat = narrative.fallbackTurn(story, action);
      const next = narrative.appendBeat(story, action, beat);
      storage.saveStory(next);
      this.setData({ streaming: false, streamText: "" });
      this.refresh(next);
      console.warn("AI stream failed, fallback used:", error);
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
