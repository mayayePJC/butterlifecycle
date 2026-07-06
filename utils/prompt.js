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
  "除 writer 外，每个职能字段必须很短，数组最多 2 项。",
  "硬规则：角色不能突然变成另一个人；一次勇敢不等于永久改变；偏航会回弹；离谱事件必须偿还因果债；世界异化度只负责开门，不负责强推；每 3-5 步需要现实回拽；黑暗走向必须呈现代价，不能美化。",
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
  "    \"story_text\": \"70-120 字，具体写外部结果\",",
  "    \"inner_reaction\": \"35-70 字，写角色如何理解这次选择\",",
  "    \"reality_or_temptation\": \"25-60 字，写现实回拽或诱惑\",",
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
  "硬规则：人物必须普通具体；事件必须小而有压力；选项不能替用户写结果；不要突然转成大灾难或超能力；不要美化黑暗选择。",
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
  return [
    {
      role: "system",
      content: [
        ROLE_SKILL_RULES,
        "本次任务：随机生成一个可长期叙事的人物底盘。",
        "内容必须克制精短：所有数组 2-4 项，每项 4-12 个汉字；summary 45-70 字；selves 每项 12-24 字。",
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
      content: "请按 6 个职能顺序随机生成一个新的《蝴蝶人生》人物。不要名人，不要超能力，不要苦难堆砌。"
    }
  ];
}

function buildSeedMessages() {
  return [
    {
      role: "system",
      content: [
        "你是《蝴蝶人生》的开局生成器。",
        "一次生成一个普通人物和一个适配她的起点事件。",
        "这是轻量开局，不需要输出 6 个 role skill；但要遵守：人物具体、现实克制、事件小而有压力、选择不替用户写结果。",
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
        "长度限制：summary 35-55 字；event.text 35-60 字；innerReaction 20-36 字；pressure 20-36 字；数组 2-3 项。"
      ].join("\n")
    },
    {
      role: "user",
      content: "请随机生成一个新的《蝴蝶人生》开局：人物 + 起点事件 + 3 个选择。不要名人，不要超能力，不要苦难堆砌。"
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
        "事件要具体、小而有压力，可以引发选择，但不要直接变成大灾难。",
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
        "请生成一个能开启故事、但仍在现实生活半径内的起点事件。"
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
        "请让这一回合鲜活、克制、可继续选择。"
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
