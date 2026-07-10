const assert = require("assert");
const prompt = require("../utils/prompt");
const narrative = require("../utils/narrative");

const story = {
  character: {
    title: "盐井记账员",
    tagline: "她替井底核对名字",
    identity: "盐井城第七账房的夜班记账员",
    summary: "她负责把井底工人的名字和盐债对齐，习惯把自己的疑问写进废纸背面。",
    inertia: ["守规矩", "先忍住"],
    desires: ["弄清井底声音", "保住妹妹学费"],
    fears: ["欠债失控", "连累家人"],
    moralLine: "不会把别人的名字随便写进死账。",
    relationPulls: ["妹妹的学费", "账房师傅"],
    resources: ["半本盐账", "一串井钥匙"],
    selves: {
      subject: "她想知道自己能不能拒绝一笔错账。",
      object: "她觉得自己只是账房里最轻的影子。",
      material: "墨渍、盐尘和旧钥匙跟着她。",
      social: "别人眼中她安静可靠，从不多问。",
      spiritual: "她想保住一点不被盐债腌透的判断。",
      pure: "她仍记得自己小时候讨厌假账。"
    }
  },
  event: {
    text: "她发现账本自动多出一个还活着的工人名字。"
  },
  beats: [
    {
      turn: 1,
      action: null,
      scene: "她发现账本自动多出一个还活着的工人名字。",
      innerReaction: "她第一反应是合上账本，手心却沾满盐霜。",
      pressure: "明早账房师傅就要拿这本账去盖死账章。",
      choices: [
        { tag: "顺着惯性", text: "照旧把账本锁进柜子。" },
        { tag: "试探偏离", text: "先去井口确认那个工人是否还活着。" },
        { tag: "押上代价", text: "偷走账本，冒着丢工作的风险查清楚。" }
      ],
      stateNote: "开局惯性已经显形，转向尚未开始沉积。"
    }
  ],
  hiddenStatus: {
    inertia: 68,
    momentDeviation: 0,
    sedimentation: 0,
    realityPressure: 28,
    worldStrangeness: 2
  },
  importantChoices: [],
  causalDebt: [],
  openThreads: [],
  knownFacts: []
};

const action = story.beats[0].choices[2];
const messages = prompt.buildTurnMessages(story, action);
const serialized = JSON.stringify(messages);

assert.match(serialized, /12-16 回合/);
assert.match(serialized, /偏离开始/);
assert.match(serialized, /惯性回拽/);
assert.match(serialized, /代价谈判/);
assert.match(serialized, /暂时定型/);
assert.match(serialized, /life_pacing/);
assert.match(serialized, /顺着惯性/);
assert.match(serialized, /试探偏离/);
assert.match(serialized, /押上代价/);
assert.match(serialized, /不能立刻兑现终局/);

const next = narrative.appendBeat(story, action, {
  scene: "她把账本藏进盐袋，井口的绞盘已经开始点名。",
  innerReaction: "她知道自己不是勇敢到底，只是暂时不肯把名字交出去。",
  pressure: "师傅发现账柜少了一本，开始逐个盘问夜班的人。",
  choices: story.beats[0].choices,
  stateNote: "惯性:0；瞬时偏航:0；人格沉积:0；现实压力:0；世界异化:0"
});

assert.ok(next.hiddenStatus.momentDeviation > story.hiddenStatus.momentDeviation);
assert.ok(next.hiddenStatus.realityPressure > story.hiddenStatus.realityPressure);
