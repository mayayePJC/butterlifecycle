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
    scrollIntoView: "",
    showStatus: false,
    statusList: [],
    statusHint: "她仍在原本的人生附近"
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
      statusList: this.buildStatusList(story.hiddenStatus),
      statusHint: this.statusHint(story.hiddenStatus),
      scrollIntoView: "story-bottom"
    });
  },

  buildStatusList(status) {
    return [
      { name: "惯性", value: status.inertia, color: "#8C7E6A" },
      { name: "瞬时偏航", value: status.momentDeviation, color: "#4A5D50" },
      { name: "人格沉积", value: status.sedimentation, color: "#24362B" },
      { name: "现实压力", value: status.realityPressure, color: "#6B2D2D" },
      { name: "世界异化", value: status.worldStrangeness, color: "#695D4A" }
    ];
  },

  statusHint(status) {
    if (status.worldStrangeness > 32) return "门已经出现，但她未必会走进去";
    if (status.realityPressure > 62) return "现实正在用力把她拽回去";
    if (status.sedimentation > 26) return "某些选择开始沉进她的骨头";
    if (status.momentDeviation > 18) return "她刚刚离开旧轨道一点";
    return "她仍在原本的人生附近";
  },

  toggleStatus() {
    this.setData({ showStatus: !this.data.showStatus });
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

    if (!config.enabled || !config.apiKey) {
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
      onDelta: (delta, fullText) => {
        this.setData({
          streamText: this.streamingHint(fullText),
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
      wx.showToast({
        title: error.message ? "AI 未通过审稿，已用本地续写" : "已用本地续写",
        icon: "none"
      });
    });
  },

  streamingHint(fullText) {
    const text = fullText || "";
    if (text.indexOf("\"reviewer\"") >= 0) return "审稿官正在检查角色一致性、因果债和安全边界...";
    if (text.indexOf("\"writer\"") >= 0) return "编剧官正在把这一回合写成可读的场景...";
    if (text.indexOf("\"genre_gatekeeper\"") >= 0) return "世界类型官正在判断门能开到哪里...";
    if (text.indexOf("\"fate_director\"") >= 0) return "命运官正在安排现实的回应和代价...";
    if (text.indexOf("\"psychologist\"") >= 0) return "心理官正在判断这次选择是否真的留下痕迹...";
    if (text.indexOf("\"archivist\"") >= 0) return "档案官正在整理已经发生的事实...";
    return "叙事引擎正在按 6 个职能处理这一回合...";
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
