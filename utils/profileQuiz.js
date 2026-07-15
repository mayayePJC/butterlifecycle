const DIMENSIONS = {
  self: {
    name: "自我",
    meaning: "听见欲望、做决定、持续违背旧惯性的能力",
    low: "自我声音常被怀疑盖住",
    mid: "能听见自己，但需要反复确认",
    high: "自我声音清楚，愿意为选择负责"
  },
  relation: {
    name: "关系",
    meaning: "亲密、亏欠、责任、人情和评价对选择的牵引",
    low: "关系牵引较轻",
    mid: "重要关系会明显影响选择",
    high: "关系牵引很强，改变常伴随亏欠感"
  },
  resources: {
    name: "资源",
    meaning: "钱、技能、时间、身份、信息和试错缓冲",
    low: "资源余地很窄",
    mid: "能短暂试错，但不能长期悬空",
    high: "有一定缓冲，能承受较长试探"
  },
  body: {
    name: "身体",
    meaning: "精力、健康、疲惫、年龄感和神经系统承受力",
    low: "长期透支，身体先于意志报警",
    mid: "还能支撑，但需要恢复窗口",
    high: "精力可用，身体能承接改变"
  },
  world: {
    name: "世界",
    meaning: "时代、行业、城市、家庭结构、制度和运气的外部压力",
    low: "外部压力较低，选择空间相对开阔",
    mid: "环境压力明显，时间和机会被挤压",
    high: "外部系统强力挤压，个人选择常被放大代价"
  }
};

const INNER_DIMENSIONS = {
  agency: {
    name: "Agency",
    cnName: "能动性",
    meaning: "把人生从被推着走，转回主动选择和持续行动的能力",
    low: "常被局面推着走，主动选择感偏弱",
    mid: "有选择感，但需要外部确认或小步试探",
    high: "能主动定义下一步，并愿意为选择负责"
  },
  courage: {
    name: "Courage",
    cnName: "勇气",
    meaning: "在害怕、亏损和关系压力下仍然行动的能力",
    low: "面对代价时更容易收回选择",
    mid: "能在安全边界内试探风险",
    high: "害怕仍在，但能带着代价行动"
  },
  clarity: {
    name: "Clarity",
    cnName: "清明",
    meaning: "看清真实愿望、现实代价和当前处境的能力",
    low: "愿望和压力混在一起，判断容易变雾",
    mid: "能看见关键矛盾，但仍会反复确认",
    high: "能同时看见欲望、代价和可行路径"
  },
  resilience: {
    name: "Resilience",
    cnName: "韧性",
    meaning: "承受回弹、失败、孤独和现实消耗后继续调整的能力",
    low: "承受力偏薄，变化容易迅速耗竭",
    mid: "能承受一段试探，但需要恢复窗口",
    high: "能在压力回弹后修正节奏并继续"
  },
  flexibility: {
    name: "Flexibility",
    cnName: "灵活性",
    meaning: "不被单一路径困住，在坚持和调整之间切换的能力",
    low: "容易被唯一正确路径困住",
    mid: "能尝试替代路径，但切换成本明显",
    high: "能在变化中保留多种走法"
  }
};

const INNER_EFFECTS = {
  stability_math: { agency: -1, courage: -3, clarity: 2 },
  others_view: { agency: -3, courage: -2, clarity: -1 },
  self_doubt: { agency: -5, courage: -3, clarity: -2 },
  too_tired: { agency: -2, resilience: -5 },
  wait_for_proof: { agency: -3, courage: -2, clarity: 1, flexibility: -2 },
  ask_people: { agency: -2, clarity: 1 },
  small_test: { agency: 5, courage: 2, clarity: 4, flexibility: 4 },
  hard_cut: { agency: 4, courage: 5, clarity: -1, resilience: -2 },
  more_freedom: { agency: 4, courage: 2, flexibility: 2 },
  be_seen: { agency: 2, courage: 2, clarity: 2 },
  start_over: { agency: 4, courage: 4, flexibility: 3 },
  rest_first: { agency: 1, clarity: 3, resilience: -2 },
  family_expectation: { agency: -2, courage: -3 },
  team_dependency: { agency: -1, courage: -2, resilience: 1 },
  past_self: { clarity: 2, resilience: 2, flexibility: -1 },
  future_no_one: { courage: -3, resilience: -2 },
  practical_help: { agency: 2, resilience: 3 },
  permission: { agency: 3, courage: 2, resilience: 1 },
  quiet_company: { clarity: 4, resilience: 2 },
  distance: { agency: 4, courage: 2, clarity: 2 },
  over_responsible: { agency: -3, courage: -1, resilience: 2, flexibility: -1 },
  avoid_need: { agency: -3, courage: -3 },
  prove_value: { agency: -2, courage: -1, resilience: 1 },
  quick_withdraw: { courage: 1, resilience: -2, flexibility: 2 },
  money: { courage: -3, clarity: 1, resilience: -2 },
  resume_gap: { agency: -1, courage: -2, clarity: 1 },
  waste_time: { agency: -2, clarity: -2 },
  sleep: { clarity: 2, resilience: -2 },
  "resource_blank:sleep": { clarity: 1, resilience: -2 },
  "body_limit:sleep": { clarity: 2, resilience: 3 },
  skill: { agency: 3, clarity: 2, resilience: 2 },
  discipline: { agency: 2, resilience: 4, flexibility: -1 },
  network: { agency: 1, resilience: 3, flexibility: 1 },
  taste: { agency: 2, clarity: 5, flexibility: 2 },
  income_drop: { courage: -4, resilience: -2 },
  status_loss: { courage: -3, flexibility: -1 },
  time_loss: { clarity: -1, resilience: -3 },
  trust_loss: { courage: -3, resilience: -2 },
  tired: { agency: -2, resilience: -5 },
  tense: { clarity: -2, resilience: -3, flexibility: -1 },
  numb: { agency: -3, clarity: -4, resilience: -3 },
  ok_but_cut: { clarity: -1, flexibility: -2 },
  push_harder: { agency: 1, resilience: 2, flexibility: -2 },
  freeze: { agency: -4, courage: -3, resilience: -3 },
  control_details: { clarity: 1, flexibility: -2 },
  seek_air: { agency: 2, clarity: 3, resilience: 2, flexibility: 2 },
  slower_rhythm: { clarity: 2, resilience: 1, flexibility: 2 },
  less_noise: { clarity: 3, resilience: 1 },
  body_trust: { agency: 3, clarity: 4, resilience: 2 },
  speed: { clarity: -2, resilience: -2, flexibility: -1 },
  competition: { agency: -2, courage: -1, resilience: -2 },
  uncertainty: { clarity: -2, flexibility: 1 },
  narrow_path: { agency: -2, courage: -2, flexibility: -3 },
  small_project: { agency: 3, clarity: 2, resilience: 2, flexibility: 4 },
  new_relation: { courage: 2, flexibility: 4 },
  accident: { courage: 1, resilience: -1, flexibility: 4 },
  private_practice: { agency: 3, clarity: 3, resilience: 4 },
  dignity: { agency: 4, courage: 3, clarity: 3 },
  important_people: { resilience: 2, flexibility: 1 },
  health: { clarity: 3, resilience: 2 },
  creative_fire: { agency: 3, courage: 2, clarity: 2, flexibility: 3 }
};

const QUESTIONS = [
  {
    id: "self_new_direction",
    group: "自我",
    text: "当你很想尝试一个新方向时，第一反应通常是？",
    options: [
      { id: "stability_math", text: "先算它会不会影响收入和稳定", effects: { resources: -8, world: 3 }, tags: ["先算稳定"] },
      { id: "others_view", text: "先想别人会不会觉得我不靠谱", effects: { relation: 8, self: -3 }, tags: ["在意评价"] },
      { id: "self_doubt", text: "先兴奋一下，然后很快开始自我怀疑", effects: { self: -8 }, tags: ["欲望被怀疑打断"] },
      { id: "too_tired", text: "先拖着，因为现在真的太累了", effects: { body: -9, self: -2 }, tags: ["疲惫优先"] }
    ]
  },
  {
    id: "self_decision_style",
    group: "自我",
    text: "一个选择没有标准答案时，你更常怎么做？",
    options: [
      { id: "wait_for_proof", text: "等更多证据，直到它看起来足够安全", effects: { self: -4, resources: 2 }, tags: ["等待确定性"] },
      { id: "ask_people", text: "问几个重要的人，先看他们的反应", effects: { relation: 7, self: -2 }, tags: ["借关系确认"] },
      { id: "small_test", text: "先做一个很小、可撤回的试验", effects: { self: 8, resources: 3 }, tags: ["小步试探"] },
      { id: "hard_cut", text: "忍到某个点后突然切断旧路", effects: { self: 5, relation: 4, resources: -8 }, tags: ["爆发式切换"] }
    ]
  },
  {
    id: "self_wish",
    group: "自我",
    text: "你最难承认的愿望更接近哪一种？",
    options: [
      { id: "more_freedom", text: "我想要更自由的时间和节奏", effects: { self: 5, resources: -2, world: 3 }, tags: ["想要时间自由"] },
      { id: "be_seen", text: "我想被认真看见，而不是只被需要", effects: { self: 4, relation: 5 }, tags: ["渴望被看见"] },
      { id: "start_over", text: "我想从某个身份里重新开始", effects: { self: 6, relation: 3, resources: -3 }, tags: ["想重新开始"] },
      { id: "rest_first", text: "我想先停下来，不再证明什么", effects: { body: -6, self: 3 }, tags: ["想停止证明"] }
    ]
  },
  {
    id: "relation_disappoint",
    group: "关系",
    text: "想到改变现状时，最容易浮现的是谁？",
    options: [
      { id: "family_expectation", text: "家人或伴侣的期待", effects: { relation: 10 }, tags: ["家人期待"] },
      { id: "team_dependency", text: "工作伙伴或团队对我的依赖", effects: { relation: 7, world: 3 }, tags: ["团队依赖"] },
      { id: "past_self", text: "过去那个努力撑到现在的自己", effects: { self: -2, resources: 3 }, tags: ["舍不得过往投入"] },
      { id: "future_no_one", text: "未来可能没有人接住我", effects: { relation: 5, resources: -5 }, tags: ["害怕无人接住"] }
    ]
  },
  {
    id: "relation_support",
    group: "关系",
    text: "你最需要别人给你的支持是？",
    options: [
      { id: "practical_help", text: "具体帮忙分担一些现实事务", effects: { relation: 4, resources: 5, body: 3 }, tags: ["需要实际分担"] },
      { id: "permission", text: "允许我不那么可靠一次", effects: { relation: 7, self: 3 }, tags: ["需要被允许"] },
      { id: "quiet_company", text: "不用劝我，只安静陪我想清楚", effects: { relation: 4, self: 5 }, tags: ["需要安静陪伴"] },
      { id: "distance", text: "给我一点距离，别立刻评价", effects: { relation: -3, self: 6 }, tags: ["需要距离"] }
    ]
  },
  {
    id: "relation_pattern",
    group: "关系",
    text: "在人际关系里，你最常重复的模式是？",
    options: [
      { id: "over_responsible", text: "先照顾局面，之后才想自己", effects: { relation: 8, body: -3, self: -3 }, tags: ["先照顾局面"] },
      { id: "avoid_need", text: "不太开口要东西，怕显得麻烦", effects: { relation: 5, self: -4 }, tags: ["不敢开口要"] },
      { id: "prove_value", text: "通过有用来证明自己值得被留下", effects: { relation: 6, body: -4, world: 2 }, tags: ["用有用换安全"] },
      { id: "quick_withdraw", text: "一旦失望，就很想迅速撤离", effects: { relation: -2, self: 4, resources: -2 }, tags: ["失望后撤离"] }
    ]
  },
  {
    id: "resource_blank",
    group: "资源",
    text: "如果人生突然给你三个月空白，你最可能先担心？",
    options: [
      { id: "money", text: "钱和下一步安排", effects: { resources: -10, world: 4 }, tags: ["现金流敏感"] },
      { id: "resume_gap", text: "履历中断后怎么解释", effects: { resources: -4, world: 7 }, tags: ["履历压力"] },
      { id: "waste_time", text: "怕自己浪费这段时间", effects: { self: -4, body: -2 }, tags: ["怕浪费机会"] },
      { id: "sleep", text: "可能会先睡很久，恢复一点知觉", effects: { body: -9 }, tags: ["需要恢复"] }
    ]
  },
  {
    id: "resource_asset",
    group: "资源",
    text: "你现在最可靠的资源是什么？",
    options: [
      { id: "skill", text: "某种可变现的技能或经验", effects: { resources: 8, self: 2 }, tags: ["技能可变现"] },
      { id: "discipline", text: "长期自律和解决问题的能力", effects: { resources: 5, body: -2, self: 3 }, tags: ["靠自律撑住"] },
      { id: "network", text: "一些信任我的人和关系", effects: { relation: 5, resources: 5 }, tags: ["有人信任"] },
      { id: "taste", text: "审美、判断力或对方向的敏感", effects: { self: 6, resources: 2 }, tags: ["判断力敏锐"] }
    ]
  },
  {
    id: "resource_cost",
    group: "资源",
    text: "你最难承受哪种试错成本？",
    options: [
      { id: "income_drop", text: "收入明显下降", effects: { resources: -9, world: 3 }, tags: ["怕收入下降"] },
      { id: "status_loss", text: "已有身份和履历失效", effects: { resources: -4, world: 6, relation: 2 }, tags: ["怕身份失效"] },
      { id: "time_loss", text: "投入很久却没有结果", effects: { resources: -5, body: -3 }, tags: ["怕长期无果"] },
      { id: "trust_loss", text: "重要的人不再相信我", effects: { relation: 9, self: -2 }, tags: ["怕失去信任"] }
    ]
  },
  {
    id: "body_signal",
    group: "身体",
    text: "你的身体最近最常发出的信号是？",
    options: [
      { id: "tired", text: "累，恢复很慢", effects: { body: -10 }, tags: ["恢复很慢"] },
      { id: "tense", text: "紧绷，停下来也不太放松", effects: { body: -7, world: 3 }, tags: ["长期紧绷"] },
      { id: "numb", text: "麻木，对很多事没感觉", effects: { body: -6, self: -5 }, tags: ["感觉变钝"] },
      { id: "ok_but_cut", text: "还行，但时间被切得很碎", effects: { body: -3, world: 6 }, tags: ["时间碎片化"] }
    ]
  },
  {
    id: "body_pressure",
    group: "身体",
    text: "压力很大时，你更像哪一种？",
    options: [
      { id: "push_harder", text: "继续硬撑，先把事做完", effects: { body: -8, resources: 3 }, tags: ["硬撑完成"] },
      { id: "freeze", text: "卡住，知道该做但动不起来", effects: { body: -7, self: -4 }, tags: ["压力下冻结"] },
      { id: "control_details", text: "开始控制细节，让自己有点秩序感", effects: { body: -4, resources: 3, self: -2 }, tags: ["靠控制稳住"] },
      { id: "seek_air", text: "需要空间、走路、独处，才回得来", effects: { body: 3, self: 3 }, tags: ["需要空间恢复"] }
    ]
  },
  {
    id: "body_limit",
    group: "身体",
    text: "如果要真正转向，你最需要身体层面的什么？",
    options: [
      { id: "sleep", text: "稳定睡眠", effects: { body: -6 }, tags: ["需要睡眠"] },
      { id: "slower_rhythm", text: "更慢的节奏", effects: { body: -4, world: 3 }, tags: ["需要慢节奏"] },
      { id: "less_noise", text: "少一点信息和人际噪音", effects: { body: -3, relation: 2, world: 2 }, tags: ["需要少噪音"] },
      { id: "body_trust", text: "重新相信自己的体感判断", effects: { body: 2, self: 5 }, tags: ["重建体感判断"] }
    ]
  },
  {
    id: "world_pressure",
    group: "世界",
    text: "你感觉外部世界最常怎样挤压你？",
    options: [
      { id: "speed", text: "所有东西都太快，来不及消化", effects: { world: 8, body: -4 }, tags: ["世界太快"] },
      { id: "competition", text: "比较和竞争让人不能停", effects: { world: 9, self: -2 }, tags: ["竞争压力"] },
      { id: "uncertainty", text: "规则变化太快，计划总被打断", effects: { world: 8, resources: -4 }, tags: ["规则不稳"] },
      { id: "narrow_path", text: "能被认可的路太窄", effects: { world: 7, relation: 3, self: -2 }, tags: ["被认可的路窄"] }
    ]
  },
  {
    id: "world_opening",
    group: "世界",
    text: "你更相信哪种机会会打开人生岔路？",
    options: [
      { id: "small_project", text: "一个小项目慢慢长大", effects: { world: 2, resources: 4, self: 4 }, tags: ["小项目长大"] },
      { id: "new_relation", text: "遇到一个不同圈层的人", effects: { relation: 5, world: 4 }, tags: ["新关系开门"] },
      { id: "accident", text: "一次意外打断原来的安排", effects: { world: 6, resources: -3 }, tags: ["意外打断"] },
      { id: "private_practice", text: "一段长期私下练习终于显影", effects: { self: 5, resources: 3 }, tags: ["长期练习显影"] }
    ]
  },
  {
    id: "world_bottom_line",
    group: "世界",
    text: "无论怎么变，你最不想牺牲的是？",
    options: [
      { id: "dignity", text: "基本尊严，不被异化成工具", effects: { self: 7, world: 2 }, tags: ["守住尊严"] },
      { id: "important_people", text: "几个重要的人和关系", effects: { relation: 8 }, tags: ["守住重要关系"] },
      { id: "health", text: "身体和精神的底线", effects: { body: 5, self: 3 }, tags: ["守住身体底线"] },
      { id: "creative_fire", text: "还能创造、好奇和被触动", effects: { self: 6, body: 2 }, tags: ["守住创造力"] }
    ]
  }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function descriptorFor(dimension, score) {
  const item = DIMENSIONS[dimension];
  if (score <= 38) return item.low;
  if (score >= 63) return item.high;
  return item.mid;
}

function innerDescriptorFor(dimension, score) {
  const item = INNER_DIMENSIONS[dimension];
  if (score <= 38) return item.low;
  if (score >= 63) return item.high;
  return item.mid;
}

function publicQuestions() {
  return QUESTIONS.map(function (question) {
    return {
      id: question.id,
      group: question.group,
      text: question.text,
      options: question.options.map(function (option) {
        return {
          id: option.id,
          text: option.text
        };
      })
    };
  });
}

function summarizeAnswers(answerMap) {
  const answers = answerMap || {};
  const scores = {
    self: 50,
    relation: 50,
    resources: 50,
    body: 50,
    world: 50
  };
  const innerScores = {
    agency: 50,
    courage: 50,
    clarity: 50,
    resilience: 50,
    flexibility: 50
  };
  const selected = [];
  const tags = [];

  QUESTIONS.forEach(function (question) {
    const optionId = answers[question.id];
    const option = question.options.find(function (item) {
      return item.id === optionId;
    });
    if (!option) return;
    Object.keys(option.effects || {}).forEach(function (key) {
      scores[key] = clamp((scores[key] || 50) + option.effects[key], 10, 90);
    });
    const innerEffects = INNER_EFFECTS[question.id + ":" + option.id] || INNER_EFFECTS[option.id] || {};
    Object.keys(innerEffects).forEach(function (key) {
      innerScores[key] = clamp((innerScores[key] || 50) + innerEffects[key], 10, 90);
    });
    selected.push({
      question: question.text,
      answer: option.text,
      group: question.group
    });
    (option.tags || []).forEach(function (tag) {
      if (tags.indexOf(tag) < 0) tags.push(tag);
    });
  });

  const dimensions = {};
  Object.keys(scores).forEach(function (key) {
    dimensions[key] = {
      name: DIMENSIONS[key].name,
      score: scores[key],
      meaning: DIMENSIONS[key].meaning,
      state: descriptorFor(key, scores[key])
    };
  });

  const innerDimensions = {};
  Object.keys(innerScores).forEach(function (key) {
    innerDimensions[key] = {
      name: INNER_DIMENSIONS[key].name,
      cnName: INNER_DIMENSIONS[key].cnName,
      score: innerScores[key],
      meaning: INNER_DIMENSIONS[key].meaning,
      state: innerDescriptorFor(key, innerScores[key])
    };
  });

  const answeredCount = selected.length;
  if (answeredCount < QUESTIONS.length) {
    throw new Error("选择题尚未完成，请答完全部题目。");
  }

  return {
    mode: "semi_real_quiz",
    answeredCount,
    dimensions,
    innerDimensions,
    tags: tags.slice(0, 12),
    answers: selected,
    summary: [
      "自我：" + dimensions.self.state,
      "关系：" + dimensions.relation.state,
      "资源：" + dimensions.resources.state,
      "身体：" + dimensions.body.state,
      "世界：" + dimensions.world.state,
      "内在：" + [
        innerDimensions.agency.cnName + innerDimensions.agency.score,
        innerDimensions.courage.cnName + innerDimensions.courage.score,
        innerDimensions.clarity.cnName + innerDimensions.clarity.score,
        innerDimensions.resilience.cnName + innerDimensions.resilience.score,
        innerDimensions.flexibility.cnName + innerDimensions.flexibility.score
      ].join("/")
    ].join("；")
  };
}

module.exports = {
  DIMENSIONS,
  INNER_DIMENSIONS,
  QUESTIONS,
  publicQuestions,
  summarizeAnswers
};
