function formatCharacter(character) {
  return [
    "当前身份：" + character.identity,
    "人物标题：" + character.title,
    "人物摘要：" + character.summary,
    "人格惯性：" + character.inertia.join("、"),
    "深层欲望：" + character.desires.join("、"),
    "最大恐惧：" + character.fears.join("、"),
    "道德底线：" + character.moralLine,
    "关系牵引：" + character.relationPulls.join("、"),
    "资源状态：" + character.resources.join("、"),
    "六个自我：" + JSON.stringify(character.selves)
  ].join("\n");
}

function recentBeats(story, limit) {
  return story.beats.slice(-(limit || 5)).map(function (beat) {
    const action = beat.action ? "选择：" + beat.action.tag + " / " + beat.action.text + "\n" : "";
    const state = beat.stateNote ? "\n状态：" + beat.stateNote : "";
    return "第 " + beat.turn + " 回合\n" + action + "外部剧情：" + beat.scene + "\n内心：" + beat.innerReaction + "\n现实回拽：" + beat.pressure + state;
  }).join("\n\n");
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  const copy = list.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    const value = copy[index];
    copy[index] = copy[other];
    copy[other] = value;
  }
  return copy;
}

function classifyAction(action) {
  const text = ((action && action.intent) || "") + " " + ((action && action.tag) || "") + " " + ((action && action.text) || "");
  if (/return_to_inertia|回到惯性|顺着惯性|保持安全|退回/.test(text)) {
    return "顺着惯性：短期更安全，但会加深旧生活的牵引，并让机会慢慢变窄。";
  }
  if (/high_deviation|高偏航|押上代价|冒险|越界/.test(text)) {
    return "押上代价：可以猛烈偏离，但后续必须出现反扑、代价或关系断裂，不能立刻胜利。";
  }
  return "试探偏离：只迈出可持续的一步，后续需要坚持、反复和具体代价才会沉积成人生转向。";
}

function buildPacingContext(story, action) {
  const currentTurn = story.beats.length || 1;
  const nextTurn = currentTurn + 1;
  const arcSteps = ["偏离开始", "惯性回拽", "代价谈判", "暂时定型"];
  const arcStep = arcSteps[Math.max(0, (nextTurn - 2) % arcSteps.length)];
  let lifePhase = "开局惯性";
  let timeScale = "数小时到数周";
  if (nextTurn >= 5 && nextTurn <= 8) {
    lifePhase = "第一次转型";
    timeScale = "数周到一年";
  } else if (nextTurn >= 9 && nextTurn <= 12) {
    lifePhase = "中段代价";
    timeScale = "数月到三年";
  } else if (nextTurn >= 13) {
    lifePhase = "晚期回收";
    timeScale = "一年到数年";
  }
  return {
    target_length: "12-16 回合走完一生，不要 6 回合内结局。",
    next_turn: nextTurn,
    life_phase: lifePhase,
    arc_step: arcStep,
    time_scale: timeScale,
    selected_action_pressure: classifyAction(action),
    core_rule: "重大转向需要 偏离开始 -> 惯性回拽 -> 代价谈判 -> 暂时定型 这 2-4 回合逐步兑现；一次选择只能开启转向，不能立刻改命。",
    choice_rule: "下一组选项必须分别是：顺着惯性、试探偏离、押上代价；三者都要是可执行行动，不是结局描述。"
  };
}

function buildSeedDiversityBrief() {
  const worlds = [
    "近未来市井：新技术已经日常化，但麻烦仍然很生活",
    "民俗奇想：地方规矩、旧传说或仪式真的会影响日常",
    "宇宙边境日常：空间站、月面设施或轨道集市里的小人物",
    "梦境官僚制：梦、记忆、影子或名字被登记、审核、租借",
    "生态异变：天气、植物、潮汐或季节有了可协商的规则",
    "时间错位现实：某段时间、某一天或某个年龄被临时借走",
    "物件社会：旧物、票据、钥匙、房间或机器保留自己的要求",
    "地下城市：地铁、隧道、旧商场或避难层形成另一套秩序",
    "小镇怪谈现实化：怪事存在，但影响首先落在账单、关系和责任上",
    "低魔日常：奇异能力稀少、昂贵、有手续，并且要付现实代价"
  ];
  const identities = [
    "梦境边检员",
    "月面温室临时工",
    "旧物听证员",
    "影子修补师",
    "失物招领站夜班员",
    "记忆账本校对员",
    "地下电梯检修员",
    "天气档案助理",
    "时间借贷柜员",
    "迁徙城市地图员",
    "无人剧院放映员",
    "海底车站广播员",
    "民俗办事处实习生",
    "废弃游乐园看守",
    "轨道集市送件人",
    "梦后清洁员"
  ];
  const pressures = [
    "收到一份系统判给她的陌生责任",
    "发现某个熟悉的人或物正在被规则抹去",
    "必须在公开手续和私下救人之间选择",
    "一个小错误即将牵出昂贵代价",
    "她掌握的信息会让某段关系失衡",
    "一件旧物要求她偿还从未听说过的债",
    "一次普通交接暴露出世界规则的漏洞",
    "她被要求替另一个版本的自己签字",
    "一个温柔请求和一条冷冰冰的规定冲突",
    "她发现别人习以为常的秩序正在伤害某个人"
  ];
  const tones = [
    "温柔荒诞",
    "悬疑童话",
    "赛博市井",
    "民俗偏航",
    "宇宙日常",
    "黑色幽默",
    "潮湿奇谈",
    "明亮怪诞"
  ];
  const avoid = shuffle([
    "便利店",
    "店长",
    "加班顶班",
    "凌晨消息",
    "失联同事",
    "星辰学园",
    "见习法师",
    "预言",
    "跨位面阴谋",
    "被选中的救世主"
  ]).slice(0, 5);
  return {
    random_seed: Date.now().toString(36) + "-" + Math.floor(Math.random() * 1000000).toString(36),
    world_mode: randomItem(worlds),
    identity_direction: randomItem(identities),
    opening_pressure: randomItem(pressures),
    tone: randomItem(tones),
    avoid
  };
}

function buildSkillInput(story, action) {
  const latest = story.beats[story.beats.length - 1] || {};
  return {
    character_base: {
      identity: story.character.identity,
      summary: story.character.summary,
      inertia: (story.character.inertia || []).slice(0, 3),
      deep_desires: (story.character.desires || []).slice(0, 2),
      core_fears: (story.character.fears || []).slice(0, 2),
      moral_line: story.character.moralLine,
      relationships: (story.character.relationPulls || []).slice(0, 3),
      pure_self: story.character.selves && story.character.selves.pure
    },
    story_state: {
      turn_index: story.beats.length,
      life_pacing: buildPacingContext(story, action),
      current_scene: latest.scene || story.event.text,
      known_facts: (story.knownFacts || []).slice(-4),
      open_threads: (story.openThreads || []).slice(-4),
      recent_choices: (story.importantChoices || []).slice(-3),
      causal_debt: (story.causalDebt || []).slice(-3),
      hidden_state: {
        inertia_strength: story.hiddenStatus.inertia,
        instant_deviation: story.hiddenStatus.momentDeviation,
        personality_sediment: story.hiddenStatus.sedimentation,
        reality_pressure: story.hiddenStatus.realityPressure,
        world_strangeness: story.hiddenStatus.worldStrangeness
      }
    },
    user_action: "[" + action.tag + "] " + action.text,
    previous_options: (latest.choices || []).map(function (choice) {
      return { tag: choice.tag || choice.label, text: choice.text };
    })
  };
}

const TURN_SYSTEM_PROMPT = [
  "你是微信小程序《蝴蝶人生》的叙事引擎。",
  "内部按 6 个职能检查：档案官连续性、心理官惯性、命运官代价、世界类型官边界、编剧官文本、审稿官通过。",
  "但输出必须极简，只允许 writer 和 reviewer 两个顶层字段；不要输出 archivist、psychologist、fate_director、genre_gatekeeper。",
  "叙事节奏：默认 12-16 回合走完一生；每个重大转向需要 2-4 回合，依次经历偏离开始、惯性回拽、代价谈判、暂时定型。",
  "硬规则：角色不能突然变成另一个人；一次勇敢不等于永久改变；选择只能开启转向，不能立刻兑现终局；偏航必须回弹；离谱事件必须偿还因果债；黑暗走向必须呈现代价，不能美化。",
  "跨度规则：每回合允许推进一段生活时间，但要按 life_pacing.time_scale 控制；可以写“几周后/半年后”，但必须保留执行选择的困难和旧生活的回拉。",
  "选项规则：每轮 3 个选择必须分别是顺着惯性、试探偏离、押上代价。它们都必须是具体行动，不是人生结果；不能写成一键辞职、一夜成名、彻底自由、直接结局。",
  "题材边界：保持开局的世界规则，可以奇想、低魔、近未来或荒诞，但不能突然换类型；奇异设定必须具体、有限、有代价。",
  "不要暴露内部数值和规则给用户；不要输出操作性违法指导、露骨内容或仇恨内容。",
  "总输出尽量短，目标 420-720 个汉字，避免 JSON 被截断。",
  "必须只输出合法 JSON。不要 Markdown，不要代码块，不要 JSON 之外的文字。",
  "JSON schema：",
  JSON.stringify({
    writer: {
      story_text: "70-120 字，写选择被执行后的时间推进、外部变化和未完成的转向",
      inner_reaction: "24-44 字，写角色怎样理解这次偏离或顺从，以及她为何难以坚持",
      reality_or_temptation: "24-48 字，写旧生活、关系、资源或世界规则怎样把她拽回去",
      choices: [
        { label: "顺着惯性", intent: "return_to_inertia", text: "" },
        { label: "试探偏离", intent: "mild_deviation", text: "" },
        { label: "押上代价", intent: "high_deviation", text: "" }
      ]
    },
    reviewer: {
      pass: true,
      blocking_issues: []
    }
  })
].join("\n");

const ROLE_SKILL_RULES = [
  "你是微信小程序《蝴蝶人生》的叙事引擎。",
  "你必须按 6 个职能顺序工作，但只做一次模型调用。",
  "职能顺序：档案官 -> 心理官 -> 命运官 -> 世界类型官 -> 编剧官 -> 审稿官。",
  "输出顶层必须恰好包含 6 个字段：archivist, psychologist, fate_director, genre_gatekeeper, writer, reviewer。",
  "档案官负责连续性和现实锚点；心理官负责人格惯性、欲望和恐惧；命运官负责外部压力、代价和机会；世界类型官负责克制离谱程度；编剧官负责用户可见文本；审稿官负责判定是否通过。",
  "除 writer 外，每个职能最多 1-2 个短字段；数组最多 2 项；不要长篇解释。",
  "硬规则：人物必须具体、有生活压力和人格惯性；事件必须小而有压力；选项不能替用户写结果；一次选择不能立刻改命；不要突然转成大灾难；不要美化黑暗选择。",
  "题材边界：允许奇想、低魔、近未来、民俗、梦境、宇宙日常等，但禁止套用泛 fantasy 模板、救世主模板、宏大战争模板或名人。",
  "必须只输出合法 JSON。不要 Markdown，不要代码块，不要 JSON 之外的文字。"
].join("\n");

function reviewerSchema() {
  return {
    pass: true,
    scores: "简短评分",
    blocking_issues: []
  };
}

function buildCharacterMessages() {
  const diversity = buildSeedDiversityBrief();
  return [
    {
      role: "system",
      content: [
        ROLE_SKILL_RULES,
        "本次任务：随机生成一个可长期叙事的人物底盘。",
        "内容必须精短但陌生：所有数组 2-4 项，每项 4-12 个汉字；summary 38-58 字；selves 每项 12-24 字。",
        "随机创作坐标必须显著影响人物：",
        JSON.stringify(diversity),
        "JSON schema：",
        JSON.stringify({
          archivist: {
            facts: []
          },
          psychologist: {
            inertia: [],
            desires: [],
            fears: []
          },
          fate_director: {
            pressure: ""
          },
          genre_gatekeeper: {
            boundary: ""
          },
          writer: {
            character: {
              title: "",
              tagline: "",
              identity: "",
              summary: "",
              inertia: [],
              desires: [],
              fears: [],
              moralLine: "",
              relationPulls: [],
              resources: [],
              selves: {
                subject: "",
                object: "",
                material: "",
                social: "",
                spiritual: "",
                pure: ""
              }
            }
          },
          reviewer: reviewerSchema()
        }, null, 2)
      ].join("\n")
    },
    {
      role: "user",
      content: "请按 6 个职能顺序随机生成一个新的《蝴蝶人生》人物。要和常见职业完全不同，可以异想天开，但不要名人、救世主或苦难堆砌。"
    }
  ];
}

function buildSeedMessages() {
  const diversity = buildSeedDiversityBrief();
  return [
    {
      role: "system",
      content: [
        "你是《蝴蝶人生》的开局生成器。",
        "一次生成一个人物和一个适配她的起点事件，每次都要像完全不同的故事。",
        "这是轻量开局，不需要输出 6 个 role skill；但要遵守：人物具体、选择有压力、奇想有限且有代价、选择不替用户写结果。",
        "节奏目标：一局默认 12-16 回合；开局只给出人生惯性的第一道裂缝，不要直接给出命运结论。",
        "三个起点选项必须分别是：顺着惯性、试探偏离、押上代价；都要是可执行行动，不能是结局描述。",
        "允许异想天开：低魔、近未来、民俗、梦境、宇宙边境、荒诞制度、怪谈日常都可以。",
        "禁止偷懒模板：不要重复便利店/加班/凌晨消息；不要星辰学园、见习法师、预言、跨位面阴谋、救世主血统、宏大战争。",
        "人物必须是小人物或边缘职业，不要王族、名人、天选主角。奇异身份也要有日常工作、关系牵引和现实代价。",
        "随机创作坐标必须显著影响结果：",
        JSON.stringify(diversity),
        "不要输出目标形状之外的字段。句子短一点，保证 JSON 完整闭合。",
        "只输出合法 JSON，不要 Markdown，不要解释。",
        "字段：",
        JSON.stringify({
          character: {
            title: "",
            tagline: "",
            identity: "",
            summary: "",
            inertia: [],
            desires: [],
            fears: [],
            moralLine: "",
            relationPulls: [],
            resources: [],
            selves: {
              subject: "",
              object: "",
              material: "",
              social: "",
              spiritual: "",
              pure: ""
            }
          },
          event: {
            text: "",
            innerReaction: "",
            pressure: "",
            choices: [
              { tag: "顺着惯性", text: "" },
              { tag: "试探偏离", text: "" },
              { tag: "押上代价", text: "" }
            ]
          }
        }, null, 2),
        "长度限制：title 4-12 字；tagline 8-18 字；summary 28-44 字；event.text 32-52 字；innerReaction 16-30 字；pressure 16-30 字；数组每项 2-10 字且 2 项。"
      ].join("\n")
    },
    {
      role: "user",
      content: "请随机生成一个全新的《蝴蝶人生》开局：人物 + 起点事件 + 3 个选择。要大胆、陌生、异想天开，但开局只打开一条长期人生裂缝，不要一上来写成结局。"
    }
  ];
}

function buildEventMessages(character) {
  return [
    {
      role: "system",
      content: [
        "你是《蝴蝶人生》的起点事件生成器。",
        "本次任务：根据人物底盘生成一个起点事件。",
        "事件要具体、小而有压力，可以奇异、荒诞或怪诞，但不要直接变成大灾难。",
        "这是轻量生成，不需要输出 6 个 role skill。",
        "内容必须精短：text 45-80 字，innerReaction 30-55 字，pressure 25-50 字。",
        "choices 必须 3 个，分别是顺着惯性、试探偏离、押上代价；都只能写行动，不能写结果。",
        "只输出合法 JSON，不要 Markdown，不要解释。",
        "JSON schema：",
        JSON.stringify({
          text: "",
          innerReaction: "",
          pressure: "",
          choices: [
            { tag: "顺着惯性", text: "" },
            { tag: "试探偏离", text: "" },
            { tag: "押上代价", text: "" }
          ]
        }, null, 2)
      ].join("\n")
    },
    {
      role: "user",
      content: [
        "人物底盘：",
        formatCharacter(character),
        "",
        "请生成一个能开启故事、并明显贴合人物世界规则的起点事件。"
      ].join("\n")
    }
  ];
}

function buildChoiceMessages(story) {
  const latest = story.beats[story.beats.length - 1] || {};
  return [
    {
      role: "system",
      content: [
        ROLE_SKILL_RULES,
        "本次任务：只生成下一步行动选项，不推进剧情，不写选择后的结果。",
        "三个选项分别代表：顺着惯性、试探偏离、押上代价。",
        "选项必须具体、可点击、可继续叙事；不要重复上一轮选项；不要写成直接成功、直接失败或人生结局。",
        "JSON schema：",
        JSON.stringify({
          archivist: {
            facts: [],
            avoid: []
          },
          psychologist: {
            current_inertia: "",
            active_desire: "",
            active_fear: ""
          },
          fate_director: {
            pressure_to_answer: "",
            available_costs: [],
            available_opportunities: []
          },
          genre_gatekeeper: {
            boundary: ""
          },
          writer: {
            choices: [
              { label: "顺着惯性", intent: "return_to_inertia", text: "" },
              { label: "试探偏离", intent: "mild_deviation", text: "" },
              { label: "押上代价", intent: "high_deviation", text: "" }
            ]
          },
          reviewer: reviewerSchema()
        }, null, 2)
      ].join("\n")
    },
    {
      role: "user",
      content: [
        "请按 6 个职能顺序为当前故事生成 3 个新选项。",
        "",
        "角色底盘：",
        formatCharacter(story.character),
        "",
        "隐藏状态：",
        JSON.stringify(story.hiddenStatus),
        "",
        "最近回合：",
        recentBeats(story),
        "",
        "上一组选项：",
        JSON.stringify(latest.choices || []),
        "",
        "开放线索：",
        JSON.stringify(story.openThreads || [])
      ].join("\n")
    }
  ];
}

function buildTurnMessages(story, action) {
  return [
    { role: "system", content: TURN_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        "请按 6 个职能顺序处理输入，并返回严格 JSON。",
        "",
        "结构化输入：",
        JSON.stringify(buildSkillInput(story, action)),
        "",
        "最近回合文本摘要：",
        recentBeats(story, 3),
        "",
        "本回合节奏约束：",
        JSON.stringify(buildPacingContext(story, action)),
        "",
        "请让这一回合鲜活、克制、可继续选择；推进一段人生时间，但不要把转向立刻写成终局。",
        "所有非 writer 字段宁短勿长，避免 JSON 被截断。"
      ].join("\n")
    }
  ];
}

const RETROSPECT_SYSTEM_PROMPT = [
  "你是《蝴蝶人生》的阶段性回望作者。",
  "只总结一段人生切片，不评价用户玩得好不好。",
  "语气文学、克制、具体，像一个人在回望自己暂时走到哪里。",
  "请只输出以下分段协议，不要 Markdown，不要代码块，不要额外解释：",
  "【回望】",
  "80-150 字，写她现在更像谁了，失去什么，获得什么。",
  "【失去】",
  "一个短语。",
  "【获得】",
  "一个短语。",
  "【变强的自我】",
  "从主体我、客体我、物质自我、社会自我、精神自我、纯粹自我中选一个。",
  "【仍在拖拽的旧我】",
  "一个短语。",
  "【最重要的选择】",
  "一句话。",
  "【标签】",
  "2-3 个短标签，用逗号分隔。"
].join("\n");

function buildRetrospectMessages(story) {
  return [
    { role: "system", content: RETROSPECT_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        "请为这段故事生成阶段性回望。",
        "",
        "角色底盘：",
        formatCharacter(story.character),
        "",
        "隐藏状态：",
        JSON.stringify(story.hiddenStatus),
        "",
        "重要选择：",
        story.importantChoices.length ? JSON.stringify(story.importantChoices) : "暂无。",
        "",
        "全部回合摘要：",
        recentBeats({ beats: story.beats.slice(-8) })
      ].join("\n")
    }
  ];
}

module.exports = {
  buildSeedMessages,
  buildCharacterMessages,
  buildEventMessages,
  buildChoiceMessages,
  buildTurnMessages,
  buildRetrospectMessages
};
