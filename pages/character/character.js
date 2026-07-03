const narrative = require("../../utils/narrative");
const storage = require("../../utils/storage");

Page({
  data: {
    cards: [],
    index: 0,
    current: {},
    selfList: [],
    customText: "",
    hasStory: false
  },

  onLoad() {
    const cards = narrative.getCharacterCards().map(this.decorateCharacter);
    const coverCandidates = cards
      .map(function (card, index) {
        return { card, index };
      })
      .filter(function (item) {
        return item.card.id !== "office-outsider";
      });
    const selected = coverCandidates[Math.floor(Math.random() * coverCandidates.length)] || {
      card: cards[0],
      index: 0
    };
    this.setData({
      cards,
      index: selected.index,
      current: selected.card,
      selfList: this.selfList(selected.card),
      hasStory: !!storage.readStory()
    });
  },

  decorateCharacter(character) {
    return Object.assign({}, character, {
      identityShort: character.identity.replace(/的/g, "").slice(0, 6)
    });
  },

  selfList(character) {
    if (!character || !character.selves) return [];
    return [
      { name: "主体我", value: character.selves.subject },
      { name: "客体我", value: character.selves.object },
      { name: "物质自我", value: character.selves.material },
      { name: "社会自我", value: character.selves.social },
      { name: "精神自我", value: character.selves.spiritual },
      { name: "纯粹自我", value: character.selves.pure }
    ];
  },

  nextCard() {
    const index = (this.data.index + 1) % this.data.cards.length;
    const current = this.data.cards[index];
    this.setData({
      index,
      current,
      selfList: this.selfList(current)
    });
  },

  selectCurrent() {
    wx.setStorageSync("butterfly_selected_character", this.data.current);
    wx.navigateTo({ url: "/pages/event/event" });
  },

  onCustomInput(event) {
    this.setData({ customText: event.detail.value });
  },

  useCustom() {
    const character = this.decorateCharacter(narrative.createCharacterFromText(this.data.customText));
    wx.setStorageSync("butterfly_selected_character", character);
    wx.navigateTo({ url: "/pages/event/event" });
  },

  restoreStory() {
    const story = storage.readStory();
    if (story) {
      wx.navigateTo({ url: "/pages/story/story" });
      return;
    }
    wx.showToast({ title: "还没有旧故事", icon: "none" });
  },

  clearStory() {
    storage.clearStory();
    wx.removeStorageSync("butterfly_selected_character");
    this.setData({ hasStory: false });
    wx.showToast({ title: "已清空", icon: "none" });
  },

  goSettings() {
    wx.navigateTo({ url: "/pages/settings/settings" });
  }
});
