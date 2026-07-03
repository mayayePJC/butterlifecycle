const STORAGE_KEYS = {
  STORY: "butterfly_story_v1",
  AI_CONFIG: "butterfly_ai_config_v1"
};

const DEFAULT_AI_CONFIG = {
  enabled: false,
  endpoint: "https://api.openai.com/v1/chat/completions",
  model: "gpt-4o-mini",
  apiKey: ""
};

const CHARACTER_PRESETS = [
  {
    id: "office-outsider",
    title: "唯唯诺诺的局外人",
    tagline: "九点钟的黎明，八点钟的夜",
    identity: "朝九晚八的打工人",
    summary: "她是城市缝隙里的影子，在格子间里消磨了所有棱角。那些没说出口的反驳，最终都化作深夜里的叹息。",
    inertia: ["讨好", "忍耐", "自责", "回避冲突"],
    desires: ["自由", "被尊重"],
    fears: ["失业", "惹麻烦", "被讨厌"],
    moralLine: "不会主动伤害无辜的人，也不愿把别人的痛苦当成筹码。",
    relationPulls: ["严苛主管", "曾经帮过她的同事", "总劝她忍一忍的母亲"],
    resources: ["稳定工资", "通勤时间", "一点办公技能", "疲惫的身体"],
    selves: {
      subject: "总在判断别人是否生气。",
      object: "觉得自己只是一个不该添麻烦的人。",
      material: "出租屋、磨旧的帆布包、快没电的手机。",
      social: "可靠、安静、好说话。",
      spiritual: "想要尊严，却害怕为它付账。",
      pure: "仍然记得小时候那个不肯低头的自己。"
    }
  },
  {
    id: "county-clerk",
    title: "沉默的县城办事员",
    tagline: "每一枚公章都比她响亮",
    identity: "县城窗口办事员",
    summary: "她熟悉每一张表格的去处，却不熟悉自己的去处。她把秩序看得很重，也常被秩序压得喘不过气。",
    inertia: ["守规矩", "沉默", "合理化", "控制情绪"],
    desires: ["被看见", "体面", "掌控生活"],
    fears: ["被举报", "家庭失望", "失去编制"],
    moralLine: "不愿伪造公文，也不愿把老人和孩子挡在门外。",
    relationPulls: ["同科室前辈", "催婚的父亲", "常来办事的独居老人"],
    resources: ["稳定身份", "地方人脉", "流程知识", "有限的勇气"],
    selves: {
      subject: "会先想到后果，再想到感受。",
      object: "相信自己是稳妥的人。",
      material: "整齐的工位、保温杯、旧制服。",
      social: "懂流程、态度温和、没脾气。",
      spiritual: "想在规则里保留一点善意。",
      pure: "不想承认自己正在变得麻木。"
    }
  },
  {
    id: "fulltime-mother",
    title: "被日常淹没的母亲",
    tagline: "她把所有人的明天洗干净",
    identity: "全职妈妈",
    summary: "她一天里有太多必须完成的小事，以至于自己的名字越来越像一个很久没打开的抽屉。",
    inertia: ["照顾别人", "压抑", "自责", "拖延表达"],
    desires: ["重新拥有自己", "被感谢", "被爱"],
    fears: ["被说自私", "孩子受伤", "婚姻破裂"],
    moralLine: "不会用孩子作为报复，也不会故意制造危险。",
    relationPulls: ["沉默的伴侣", "挑剔的婆婆", "幼儿园老师", "旧友"],
    resources: ["时间碎片", "家务经验", "亲子关系", "几乎耗尽的耐心"],
    selves: {
      subject: "总在别人开口前先动起来。",
      object: "以为自己必须永远有用。",
      material: "厨房、校服、购物袋、没读完的书。",
      social: "贤惠、能干、理所当然。",
      spiritual: "渴望被当成一个完整的人。",
      pure: "偶尔还会梦见独自远行。"
    }
  },
  {
    id: "laid-off-youth",
    title: "假装无所谓的失业青年",
    tagline: "他的简历像一封没人回的信",
    identity: "刚失业的青年",
    summary: "他把焦虑包装成玩笑，把失败说成休息。每一次手机亮起，都像命运敲了一下门。",
    inertia: ["逃避", "嘴硬", "熬夜", "自嘲"],
    desires: ["证明自己", "重新开始", "被需要"],
    fears: ["贫穷", "被同龄人甩下", "让家人失望"],
    moralLine: "不愿骗家人血汗钱，也不愿靠伤害弱者翻身。",
    relationPulls: ["前同事", "房东", "催他考公的姐姐", "网吧朋友"],
    resources: ["一点技术", "廉价时间", "社交网络", "信用卡账单"],
    selves: {
      subject: "会把恐惧翻译成玩笑。",
      object: "怀疑自己是不是被时代剩下了。",
      material: "二手电脑、泡面、未寄出的简历。",
      social: "看起来松弛，其实正在下坠。",
      spiritual: "想证明自己不是废物。",
      pure: "还没彻底放弃热望。"
    }
  }
];

const EVENT_LIBRARY = [
  {
    id: "fallen-elder",
    text: "上班路上，她看到一个老人在斑马线上摔倒。周围的人行色匆匆，红灯即将亮起，如果她停下来，今天一定会迟到。",
    innerReaction: "她的手心开始冒汗。旧习惯提醒她别惹麻烦，另一部分自己却已经看见那双颤抖的手。",
    pressure: "时间、旁人的目光、可能被讹的恐惧，一起把她往前推。",
    choices: [
      { tag: "保持安全", text: "假装没看见，快步走过。" },
      { tag: "细微偏航", text: "扶她到路边，然后立刻赶去原本的地方。" },
      { tag: "冒险选择", text: "留下来等救护车，并承担迟到的后果。" }
    ]
  },
  {
    id: "printed-list",
    text: "她在打印机里看到一份尚未公开的名单。名单上有一个曾经帮过她的人，也有她自己的名字。",
    innerReaction: "纸张还带着热度，她却像被一阵冷风吹过。她突然意识到，沉默也可能是一种选择。",
    pressure: "办公室里的脚步声越来越近，所有人都假装今天和往常一样。",
    choices: [
      { tag: "隐瞒", text: "把纸塞回去，装作什么都没有发生。" },
      { tag: "求助", text: "悄悄提醒那个帮过她的人。" },
      { tag: "说出真话", text: "把名单拍下来，准备向更多人摊开这件事。" }
    ]
  },
  {
    id: "unknown-transfer",
    text: "她收到一笔陌生转账，备注只有一句话：谢谢你刚才没说出来。",
    innerReaction: "她回想刚才的每一个细节，却想不起自己到底替谁保守了秘密。",
    pressure: "钱已经到账，退回去像承认自己知道什么，收下又像走进一扇没有把手的门。",
    choices: [
      { tag: "保持安全", text: "立刻原路退回这笔钱。" },
      { tag: "悬疑巧合", text: "查找转账人的线索，但暂时不声张。" },
      { tag: "越界", text: "收下钱，并试着用一句模糊的话试探对方。" }
    ]
  },
  {
    id: "blame-shift",
    text: "主管让她背一个不是她造成的锅。只要她点头，这个月的绩效就保住，其他人也会当作无事发生。",
    innerReaction: "她很熟悉这种时刻：只要把自己缩小一点，风就会过去。",
    pressure: "绩效、同事的沉默、房租和母亲的电话，都在等她低头。",
    choices: [
      { tag: "讨好别人", text: "点头，把责任揽下来。" },
      { tag: "说出真话", text: "平静说明这件事的真实经过。" },
      { tag: "求助", text: "把相关记录发给值得信任的人。" }
    ]
  }
];

module.exports = {
  STORAGE_KEYS,
  DEFAULT_AI_CONFIG,
  CHARACTER_PRESETS,
  EVENT_LIBRARY
};
