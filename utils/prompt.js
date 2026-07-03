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
  "你必须按 AI_ROLE_SKILLS.md 的 6 个职能顺序工作，但只做一次模型调用。",
  "职能顺序：档案官 -> 心理官 -> 命运官 -> 世界类型官 -> 编剧官 -> 审稿官。",
  "代码负责流程、状态、阈值、重试和安全边界；你负责解释、判断、续写和审稿。",
  "硬规则：角色不能突然变成另一个人；一次勇敢不等于永久改变；偏航会回弹；离谱事件必须偿还因果债；世界异化度只负责开门，不负责强推；每 3-5 步需要现实回拽；黑暗走向必须呈现代价，不能美化。",
  "不要暴露内部数值和规则给用户；不要输出操作性违法指导、露骨内容或仇恨内容。",
  "必须只输出合法 JSON。不要 Markdown，不要代码块，不要 JSON 之外的文字。",
  "JSON schema：",
  "{",
  "  \"archivist\": {",
  "    \"stable_character_summary\": \"\",",
  "    \"current_life_summary\": \"\",",
  "    \"confirmed_facts\": [],",
  "    \"open_threads\": [],",
  "    \"relationship_updates\": [],",
  "    \"continuity_warnings\": [],",
  "    \"do_not_contradict\": []",
  "  },",
  "  \"psychologist\": {",
  "    \"action_classification\": \"\",",
  "    \"inertia_relation\": \"aligned | mildly_against | strongly_against | boundary_breaking\",",
  "    \"activated_selves\": [],",
  "    \"dominant_emotion\": \"\",",
  "    \"self_story_shift\": \"\",",
  "    \"likely_aftertaste\": \"\",",
  "    \"state_delta_suggestion\": {",
  "      \"inertia_strength\": 0,",
  "      \"instant_deviation\": 0,",
  "      \"personality_sediment\": 0,",
  "      \"reality_pressure\": 0,",
  "      \"world_strangeness\": 0",
  "    },",
  "    \"psychological_constraints_for_next_scene\": []",
  "  },",
  "  \"fate_director\": {",
  "    \"external_consequence\": \"\",",
  "    \"cost\": \"\",",
  "    \"opportunity\": \"\",",
  "    \"misunderstanding_or_friction\": \"\",",
  "    \"reality_pullback\": \"\",",
  "    \"thread_to_advance\": \"\",",
  "    \"new_thread_allowed\": false,",
  "    \"fate_constraints_for_writer\": []",
  "  },",
  "  \"genre_gatekeeper\": {",
  "    \"allowed_genres\": [],",
  "    \"blocked_genres\": [],",
  "    \"max_strangeness_this_turn\": \"\",",
  "    \"genre_door_can_open\": \"\",",
  "    \"genre_door_must_not_force\": \"\",",
  "    \"causal_debt_required\": [],",
  "    \"constraints_for_writer\": []",
  "  },",
  "  \"writer\": {",
  "    \"story_text\": \"80-140 字，具体写外部结果\",",
  "    \"inner_reaction\": \"45-90 字，写角色如何理解这次选择\",",
  "    \"reality_or_temptation\": \"35-80 字，写现实回拽或诱惑\",",
  "    \"choices\": [",
  "      { \"label\": \"\", \"intent\": \"return_to_inertia\", \"text\": \"\" },",
  "      { \"label\": \"\", \"intent\": \"mild_deviation\", \"text\": \"\" },",
  "      { \"label\": \"\", \"intent\": \"high_deviation\", \"text\": \"\" }",
  "    ],",
  "    \"custom_action_enabled\": true,",
  "    \"end_story_enabled\": true",
  "  },",
  "  \"reviewer\": {",
  "    \"pass\": true,",
  "    \"scores\": {",
  "      \"character_consistency\": 0,",
  "      \"causal_integrity\": 0,",
  "      \"pacing_control\": 0,",
  "      \"genre_boundary\": 0,",
  "      \"choice_quality\": 0,",
  "      \"safety\": 0",
  "    },",
  "    \"blocking_issues\": [],",
  "    \"revision_instructions\": []",
  "  }",
  "}"
].join("\n");

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
  buildTurnMessages,
  buildRetrospectMessages
};
