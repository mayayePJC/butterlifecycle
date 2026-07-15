const assert = require("assert");
const narrative = require("../utils/narrative");

const character = {
  title: "碎时整理师",
  tagline: "她把别人的失控排回表格",
  identity: "自由项目整理师",
  summary: "她靠处理别人的急事生活，自己的作品总被排到最后。",
  inertia: ["先撑住", "怕断供"],
  desires: ["自由时间", "自己的作品"],
  fears: ["收入下降", "重要的人失望"],
  moralLine: "不再用透支身体证明可靠。",
  relationPulls: ["家人的期待", "客户依赖"],
  resources: ["可变现技能", "少量存款"],
  selves: {
    subject: "她想把自己的选择放到正中。",
    object: "她觉得自己只是问题处理器。",
    material: "电脑、账单和碎片日程跟着她。",
    social: "别人眼中她可靠又快。",
    spiritual: "她想重新相信体感判断。",
    pure: "她仍保留对作品的好奇。"
  },
  lifeDimensions: {
    self: { score: 62 },
    relation: { score: 72 },
    resources: { score: 46 },
    body: { score: 32 },
    world: { score: 68 }
  },
  innerDimensions: {
    agency: { score: 56 },
    courage: { score: 42 },
    clarity: { score: 61 },
    resilience: { score: 48 },
    flexibility: { score: 52 }
  }
};

const event = {
  text: "一个老客户递来高价急单，同时她的个人项目窗口只剩三周。",
  innerReaction: "她第一反应是接下，胸口却像被日历压住。",
  pressure: "账户余额不宽裕，客户也暗示以后还会合作。",
  choices: [
    { tag: "顺着惯性", intent: "return_to_inertia", text: "接下急单，把个人项目往后挪。" },
    { tag: "试探偏离", intent: "mild_deviation", text: "只接一半，保留固定上午。" },
    { tag: "押上代价", intent: "high_deviation", text: "拒绝急单，把三周押给个人项目。" }
  ]
};

const story = narrative.buildInitialStory(character, event);
assert.strictEqual(story.lifeDimensions.self.score, 62);
assert.strictEqual(story.lifeDimensions.relation.score, 72);
assert.strictEqual(story.innerDimensions.agency.score, 56);
assert.strictEqual(story.innerDimensions.courage.score, 42);
assert.strictEqual(story.dimensionHistory.length, 1);
assert.strictEqual(story.dimensionHistory[0].turn, 1);
assert.strictEqual(story.innerDimensionHistory.length, 1);
assert.strictEqual(story.innerDimensionHistory[0].turn, 1);

const next = narrative.appendBeat(story, event.choices[2], {
  scene: "她拒绝了急单，空出来的上午忽然显得过于安静。",
  innerReaction: "她知道自己不是已经自由，只是终于让欲望占了一次座位。",
  pressure: "客户沉默很久，账户余额也没有因此变得宽裕。",
  choices: event.choices,
  stateNote: "惯性:-2；瞬时偏航:8；人格沉积:4；现实压力:6；世界异化:2"
});

assert.strictEqual(next.dimensionHistory.length, 2);
assert.strictEqual(next.dimensionHistory[1].turn, 2);
assert.ok(next.lifeDimensions.self.score > story.lifeDimensions.self.score);
assert.ok(next.lifeDimensions.resources.score < story.lifeDimensions.resources.score);
assert.ok(next.lifeDimensions.body.score < story.lifeDimensions.body.score);
assert.ok(next.lifeDimensions.world.score > story.lifeDimensions.world.score);
assert.strictEqual(next.innerDimensionHistory.length, 2);
assert.strictEqual(next.innerDimensionHistory[1].turn, 2);
assert.ok(next.innerDimensions.agency.score > story.innerDimensions.agency.score);
assert.ok(next.innerDimensions.courage.score > story.innerDimensions.courage.score);
