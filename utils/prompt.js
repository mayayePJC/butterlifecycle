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

function recentBeats(story) {
  return story.beats.slice(-5).map(function (beat) {
    const action = beat.action ? "选择：" + beat.action.tag + " / " + beat.action.text + "\n" : "";
    return "第 " + beat.turn + " 回合\n" + action + "外部剧情：" + beat.scene + "\n内心：" + beat.innerReaction + "\n现实回拽：" + beat.pressure;
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
      inertia: story.character.inertia,
      deep_desires: story.character.desires,
      core_fears: story.character.fears,
      moral_boundaries: [story.character.moralLine],
      resources: story.character.resources,
      relationships: story.character.relationPulls,
      six_selves: {
        i_self: story.character.selves.subject,
        me_self: story.character.selves.object,
        material_self: story.character.selves.material,
        social_self: story.character.selves.social,
        spiritual_self: story.character.selves.spiritual,
        pure_ego: story.character.selves.pure
      },
      personality_constant: story.character.selves.pure
    },
    story_state: {
      turn_index: story.beats.length,
      current_scene: latest.scene || story.event.text,
      known_facts: story.knownFacts || [],
      open_threads: story.openThreads || [],
      recent_choices: story.importantChoices || [],
      causal_debt: story.causalDebt || [],
      hidden_state: {
        inertia_strength: story.hiddenStatus.inertia,
        instant_deviation: story.hiddenStatus.momentDeviation,
        personality_sediment: story.hiddenStatus.sedimentation,
        reality_pressure: story.hiddenStatus.realityPressure,
        world_strangeness: story.hiddenStatus.worldStrangeness
      }
    },
    user_action: "[" + action.tag + "] " + action.text,
    previous_options: latest.choices || []
  };
}

const TURN_SYSTEM_PROMPT = [
  "你是微信小程序《蝴蝶人生》的叙事引擎。",
  "你必须按 6 个职能顺序工作，但只做一次模型调用。",
  "职能顺序：档案官 -> 心理官 -> 命运官 -> 世界类型官 -> 编剧官 -> 审稿官。",
  "除 writer 外，每个职能字段必须极短，数组最多 1 项。",
  "硬规则：角色不能突然变成另一个人；一次勇敢不等于永久改变；偏航会回弹；离谱事件必须偿还因果债；世界异化度只负责开门，不负责强推；每 3-5 步需要现实回拽；黑暗走向必须呈现代价，不能美化。",
  "题材边界：保持开局的世界规则，可以奇想、低魔、近未来或荒诞，但不能突然换类型；奇异设定必须具体、有限、有代价。",
  "不要暴露内部数值和规则给用户；不要输出操作性违法指导、露骨内容或仇恨内容。",
  "必须只输出合法 JSON。不要 Markdown，不要代码块，不要 JSON 之外的文字。",
  "JSON schema：",
  "{",
  "  \"archivist\": { \"confirmed_facts\": [], \"open_threads\": [] },",
  "  \"psychologist\": {",
  "    \"inertia_relation\": \"aligned | mildly_against | strongly_against | boundary_breaking\",",
  "    \"dominant_emotion\": \"\",",
  "    \"state_delta_suggestion\": {",
  "      \"inertia_strength\": 0,",
  "      \"instant_deviation\": 0,",
  "      \"personality_sediment\": 0,",
  "      \"reality_pressure\": 0,",
  "      \"world_strangeness\": 0",
  "    }",
  "  },",
  "  \"fate_director\": {",
  "    \"cost\": \"\",",
  "    \"reality_pullback\": \"\",",
  "    \"thread_to_advance\": \"\"",
  "  },",
  "  \"genre_gatekeeper\": {",
  "    \"max_strangeness_this_turn\": \"\",",
  "    \"causal_debt_required\": []",
  "  },",
  "  \"writer\": {",
  "    \"story_text\": \"45-80 字，具体写外部结果\",",
  "    \"inner_reaction\": \"20-40 字，写角色如何理解这次选择\",",
  "    \"reality_or_temptation\": \"16-32 字，写现实回拽或诱惑\",",
  "    \"choices\": [",
  "      { \"label\": \"\", \"intent\": \"return_to_inertia\", \"text\": \"\" },",
  "      { \"label\": \"\", \"intent\": \"mild_deviation\", \"text\": \"\" },",
  "      { \"label\": \"\", \"intent\": \"high_deviation\", \"text\": \"\" }",
  "    ]",
  "  },",
  "  \"reviewer\": {",
  "    \"pass\": true,",
  "    \"scores\": \"简短评分\",",
  "    \"blocking_issues\": []",
  "  }",
  "}"
].join("\n");

const ROLE_SKILL_RULES = [
  "你是微信小程序《蝴蝶人生》的叙事引擎。",
  "你必须按 6 个职能顺序工作，但只做一次模型调用。",
  "职能顺序：档案官 -> 心理官 -> 命运官 -> 世界类型官 -> 编剧官 -> 审稿官。",
  "输出顶层必须恰好包含 6 个字段：archivist, psychologist, fate_director, genre_gatekeeper, writer, reviewer。",
  "档案官负责连续性和现实锚点；心理官负责人格惯性、欲望和恐惧；命运官负责外部压力、代价和机会；世界类型官负责克制离谱程度；编剧官负责用户可见文本；审稿官负责判定是否通过。",
  "除 writer 外，每个职能最多 1-2 个短字段；数组最多 2 项；不要长篇解释。",
  "硬规则：人物必须具体、有生活压力和人格惯性；事件必须小而有压力；选项不能替用户写结果；不要突然转成大灾难；不要美化黑暗选择。",
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
              { tag: "保持安全", text: "" },
              { tag: "细微偏航", text: "" },
              { tag: "冒险选择", text: "" }
            ]
          }
        }, null, 2),
        "长度限制：title 4-12 字；tagline 8-18 字；summary 28-44 字；event.text 32-52 字；innerReaction 16-30 字；pressure 16-30 字；数组每项 2-10 字且 2 项。"
      ].join("\n")
    },
    {
      role: "user",
      content: "请随机生成一个全新的《蝴蝶人生》开局：人物 + 起点事件 + 3 个选择。要大胆、陌生、异想天开，但不要套模板，不要苦难堆砌。"
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
        "choices 必须 3 个，分别是回到惯性、细微偏航、高偏航。",
        "只输出合法 JSON，不要 Markdown，不要解释。",
        "JSON schema：",
        JSON.stringify({
          text: "",
          innerReaction: "",
          pressure: "",
          choices: [
            { tag: "保持安全", text: "" },
            { tag: "细微偏航", text: "" },
            { tag: "冒险选择", text: "" }
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
        "三个选项分别代表：回到惯性、细微偏航、高偏航。",
        "选项必须具体、可点击、可继续叙事；不要重复上一轮选项。",
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
              { label: "回到惯性", intent: "return_to_inertia", text: "" },
              { label: "轻微偏航", intent: "mild_deviation", text: "" },
              { label: "高偏航", intent: "high_deviation", text: "" }
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
        JSON.stringify(buildSkillInput(story, action), null, 2),
        "",
        "最近回合文本摘要：",
        recentBeats(story),
        "",
        "请让这一回合鲜活、克制、可继续选择。",
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
