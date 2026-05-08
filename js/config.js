/**
 * config.js - 动物数据库 & 游戏常量 v2.3
 * 全新职业分类 + 重做数值体系 + 百分比减伤防御
 */

export const TIER_PRICES = {1: 1, 2: 3, 3: 10, 4: 30, 5: 100, 6: 300, 7: 1000, 8: 2000, 9: 6000, 10: 20000};
export const BATTLE_TIME_LIMIT = 60;
export const MAX_ARMY_SIZE = 100;

// 金币模式配置
export const MONEY_MODES = {
    poor:   { name: '贫穷', emoji: '🪙', min: 10,    max: 150,   color: '#7f8c8d' },
    normal: { name: '普通', emoji: '💰', min: 300,   max: 1000,  color: '#3498db' },
    rich:   { name: '富裕', emoji: '💎', min: 1500,  max: 8000,  color: '#f1c40f' },
    tycoon: { name: '富豪', emoji: '👑', min: 15000, max: 25000, color: '#e74c3c' },
    random: { name: '随机', emoji: '🎲', min: 0,     max: 0,     color: '#9b59b6' }
};

// 职业配置
export const CLASS_CONFIG = {
    '远程': { badge: '🏹', color: '#3498db', desc: '高射程·低血防' },
    '肉盾': { badge: '🛡️', color: '#e67e22', desc: '高血防·低伤害' },
    '战士': { badge: '⚔️', color: '#e74c3c', desc: '攻守均衡' },
    '刺客': { badge: '🗡️', color: '#9b59b6', desc: '高伤害·可绕后' },
    '神兽': { badge: '👑', color: '#f1c40f', desc: '全面碾压' }
};

/**
 * 防御公式（百分比减伤）: reduction = def / (def + 100)
 * def=50 → 33%减伤, def=100 → 50%减伤, def=200 → 67%减伤
 * 最低也会受到 5% 的基础伤害（防御再高不免疫）
 */
export function calcDamageReduction(def) {
    const reduction = def / (def + 100);
    return Math.min(reduction, 0.95); // 最多减伤95%
}

// ===== 全新动物数据库 =====
// 数值直接写死，已按职业和tier精心平衡
// hp: 生命, atk: 攻击, def: 防御(百分比减伤), spd: 攻速, range: 射程, ms: 移速

export const ANIMAL_DB = {
    // =================== TIER 1 (1G) ===================
    "🐜": {name: "蚂蚁", tier: 1, class: "战士",
        hp: 22, atk: 6, def: 3, spd: 2.0, range: 30, ms: 1.2,
        skill: null, skillDesc: ""},
    "🕷️": {name: "蜘蛛", tier: 1, class: "远程",
        hp: 12, atk: 7, def: 1, spd: 1.4, range: 400, ms: 0.9,
        skill: "减速", skillDesc: "降低目标50%攻速3秒"},
    "🐌": {name: "蜗牛", tier: 1, class: "肉盾",
        hp: 40, atk: 2, def: 12, spd: 0.5, range: 25, ms: 0.3,
        skill: null, skillDesc: ""},
    "🦂": {name: "蝎子", tier: 1, class: "刺客",
        hp: 15, atk: 10, def: 2, spd: 1.0, range: 45, ms: 1.0,
        skill: "剧毒", skillDesc: "使目标每秒损失3HP，持续5秒"},
    "🦋": {name: "蝴蝶", tier: 1, class: "远程",
        hp: 10, atk: 5, def: 0, spd: 1.8, range: 420, ms: 1.6,
        skill: null, skillDesc: ""},
    "🐛": {name: "毛虫", tier: 1, class: "肉盾",
        hp: 35, atk: 3, def: 8, spd: 0.6, range: 25, ms: 0.5,
        skill: null, skillDesc: ""},
    "🦗": {name: "蟋蟀", tier: 1, class: "战士",
        hp: 18, atk: 7, def: 2, spd: 2.5, range: 35, ms: 1.5,
        skill: null, skillDesc: ""},
    "🦟": {name: "蚊子", tier: 1, class: "刺客",
        hp: 8, atk: 9, def: 0, spd: 3.0, range: 40, ms: 3.6,
        skill: "吸血", skillDesc: "造成伤害的80%转为生命"},

    // =================== TIER 2 (3G) ===================
    "🐭": {name: "老鼠", tier: 2, class: "刺客",
        hp: 30, atk: 18, def: 3, spd: 2.2, range: 35, ms: 1.8,
        skill: null, skillDesc: ""},
    "🐰": {name: "兔子", tier: 2, class: "战士",
        hp: 45, atk: 14, def: 5, spd: 2.0, range: 45, ms: 2.2,
        skill: "闪避", skillDesc: "40%概率闪避攻击"},
    "🦔": {name: "刺猬", tier: 2, class: "肉盾",
        hp: 70, atk: 8, def: 20, spd: 1.0, range: 30, ms: 0.8,
        skill: "反刺", skillDesc: "反弹30%近战伤害"},
    "🦇": {name: "蝙蝠", tier: 2, class: "远程",
        hp: 22, atk: 15, def: 2, spd: 2.5, range: 410, ms: 2.0,
        skill: null, skillDesc: ""},
    "🦦": {name: "水獭", tier: 2, class: "战士",
        hp: 50, atk: 16, def: 6, spd: 1.8, range: 50, ms: 1.6,
        skill: null, skillDesc: ""},
    "🦐": {name: "虾", tier: 2, class: "远程",
        hp: 18, atk: 20, def: 1, spd: 3.0, range: 430, ms: 1.2,
        skill: "连击", skillDesc: "连续攻击2次"},
    "🦪": {name: "牡蛎", tier: 2, class: "肉盾",
        hp: 100, atk: 4, def: 30, spd: 0.3, range: 20, ms: 0.3,
        skill: null, skillDesc: ""},

    // =================== TIER 3 (10G) ===================
    "🐱": {name: "家猫", tier: 3, class: "刺客",
        hp: 55, atk: 35, def: 5, spd: 2.5, range: 45, ms: 2.0,
        skill: "暴击", skillDesc: "35%概率造成3倍伤害"},
    "🦊": {name: "狐狸", tier: 3, class: "刺客",
        hp: 50, atk: 32, def: 4, spd: 2.2, range: 50, ms: 2.0,
        skill: "狡猾", skillDesc: "生命低于30%时移速和攻速翻倍"},
    "🐷": {name: "家猪", tier: 3, class: "肉盾",
        hp: 160, atk: 18, def: 25, spd: 1.0, range: 40, ms: 1.0,
        skill: null, skillDesc: ""},
    "🦘": {name: "袋鼠", tier: 3, class: "战士",
        hp: 90, atk: 30, def: 8, spd: 1.8, range: 55, ms: 1.8,
        skill: "飞踢", skillDesc: "每3次攻击造成4倍伤害并击退"},
    "🦚": {name: "孔雀", tier: 3, class: "远程",
        hp: 45, atk: 28, def: 3, spd: 1.6, range: 450, ms: 1.2,
        skill: null, skillDesc: ""},
    "🐧": {name: "企鹅", tier: 3, class: "肉盾",
        hp: 120, atk: 22, def: 18, spd: 1.2, range: 40, ms: 1.0,
        skill: "严寒", skillDesc: "攻击20%概率冻结1秒"},
    "🐡": {name: "河豚", tier: 3, class: "肉盾",
        hp: 110, atk: 20, def: 30, spd: 0.8, range: 35, ms: 0.8,
        skill: "膨胀", skillDesc: "受到攻击反弹40%伤害"},

    // =================== TIER 4 (30G) ===================
    "🐶": {name: "家犬", tier: 4, class: "战士",
        hp: 180, atk: 50, def: 18, spd: 1.8, range: 55, ms: 1.8,
        skill: "忠诚", skillDesc: "友军死亡时攻击+50%"},
    "🐴": {name: "马", tier: 4, class: "战士",
        hp: 170, atk: 55, def: 15, spd: 1.6, range: 60, ms: 2.8,
        skill: "冲锋", skillDesc: "首次攻击3倍伤害并击退"},
    "🐃": {name: "水牛", tier: 4, class: "肉盾",
        hp: 320, atk: 30, def: 55, spd: 0.8, range: 50, ms: 1.0,
        skill: null, skillDesc: ""},
    "🦭": {name: "海狮", tier: 4, class: "肉盾",
        hp: 250, atk: 25, def: 35, spd: 1.2, range: 45, ms: 1.2,
        skill: "表演", skillDesc: "吸引周围敌人攻击自己"},
    "🦀": {name: "螃蟹", tier: 4, class: "刺客",
        hp: 140, atk: 60, def: 40, spd: 1.4, range: 40, ms: 1.2,
        skill: "绕后", skillDesc: "开局5秒后瞬移到敌后"},
    "🦞": {name: "龙虾", tier: 4, class: "刺客",
        hp: 130, atk: 75, def: 15, spd: 1.5, range: 45, ms: 1.4,
        skill: "绕后", skillDesc: "开局5秒后瞬移到敌后"},
    "🐙": {name: "章鱼", tier: 4, class: "远程",
        hp: 100, atk: 40, def: 8, spd: 1.5, range: 460, ms: 1.2,
        skill: "缠绕", skillDesc: "40%概率定身目标2秒"},

    // =================== TIER 5 (100G) ===================
    "🐗": {name: "野猪", tier: 5, class: "战士",
        hp: 380, atk: 110, def: 30, spd: 1.6, range: 60, ms: 2.0,
        skill: "狂暴", skillDesc: "生命低于50%攻速翻倍"},
    "🦬": {name: "野牛", tier: 5, class: "肉盾",
        hp: 650, atk: 60, def: 80, spd: 0.9, range: 55, ms: 1.4,
        skill: "践踏", skillDesc: "周围100范围造成100伤害"},
    "🦅": {name: "鹰", tier: 5, class: "远程",
        hp: 160, atk: 100, def: 8, spd: 2.0, range: 485, ms: 2.4,
        skill: null, skillDesc: ""},
    "🐍": {name: "蛇", tier: 5, class: "刺客",
        hp: 220, atk: 130, def: 12, spd: 2.2, range: 50, ms: 2.0,
        skill: "剧毒", skillDesc: "每秒损失15HP，持续5秒"},
    "🐢": {name: "陆龟", tier: 5, class: "肉盾",
        hp: 900, atk: 30, def: 120, spd: 0.4, range: 30, ms: 0.4,
        skill: "无敌", skillDesc: "抵挡致命伤害并无敌3秒"},
    "🦎": {name: "蜥蜴", tier: 5, class: "战士",
        hp: 300, atk: 95, def: 25, spd: 1.8, range: 55, ms: 2.0,
        skill: "再生", skillDesc: "每秒恢复20HP"},
    "🐸": {name: "牛蛙", tier: 5, class: "远程",
        hp: 180, atk: 85, def: 10, spd: 1.8, range: 470, ms: 1.4,
        skill: "长舌", skillDesc: "将敌人拉至面前并眩晕"},

    // =================== TIER 6 (300G) ===================
    "🐺": {name: "狼", tier: 6, class: "刺客",
        hp: 500, atk: 220, def: 30, spd: 2.4, range: 55, ms: 2.8,
        skill: "狼群", skillDesc: "周围每有1只狼伤害+20%"},
    "🐻": {name: "黑熊", tier: 6, class: "战士",
        hp: 850, atk: 200, def: 60, spd: 1.4, range: 65, ms: 1.6,
        skill: "暴击", skillDesc: "40%概率3.5倍伤害并眩晕"},
    "🐊": {name: "鳄鱼", tier: 6, class: "肉盾",
        hp: 1100, atk: 140, def: 90, spd: 1.0, range: 55, ms: 1.4,
        skill: "翻滚", skillDesc: "范围伤害50%溅射并吸血"},
    "🦈": {name: "鲨鱼", tier: 6, class: "刺客",
        hp: 550, atk: 260, def: 25, spd: 2.2, range: 60, ms: 2.6,
        skill: "血怒", skillDesc: "目标低于50%血量伤害翻倍"},

    // =================== TIER 7 (1000G) ===================
    "🦁": {name: "狮子", tier: 7, class: "战士",
        hp: 1500, atk: 350, def: 80, spd: 1.8, range: 70, ms: 2.4,
        skill: "威吓", skillDesc: "周围敌人攻击-40%"},
    "🐅": {name: "豹子", tier: 7, class: "刺客",
        hp: 900, atk: 500, def: 35, spd: 2.0, range: 50, ms: 3.2,
        skill: "潜行", skillDesc: "前5秒隐身，首次攻击5倍伤害"},
    "🦏": {name: "犀牛", tier: 7, class: "肉盾",
        hp: 2200, atk: 250, def: 150, spd: 0.8, range: 60, ms: 1.8,
        skill: "冲撞", skillDesc: "路径上敌人受到300伤害并击退"},
    "🦛": {name: "河马", tier: 7, class: "肉盾",
        hp: 2500, atk: 200, def: 130, spd: 1.0, range: 55, ms: 1.6,
        skill: "吞噬", skillDesc: "秒杀低于25%血量的敌人"},

    // =================== TIER 8 (2000G) ===================
    "🐯": {name: "成年虎", tier: 8, class: "战士",
        hp: 2800, atk: 600, def: 100, spd: 2.0, range: 75, ms: 2.6,
        skill: "处决", skillDesc: "对低于35%血量敌人直接秒杀"},
    "🐻‍❄️": {name: "北极熊", tier: 8, class: "肉盾",
        hp: 4200, atk: 350, def: 200, spd: 1.2, range: 65, ms: 1.8,
        skill: "冰封", skillDesc: "50%概率冻结3秒，冻结敌人受伤翻倍"},
    "🦣": {name: "猛犸象", tier: 8, class: "肉盾",
        hp: 5500, atk: 300, def: 250, spd: 0.5, range: 55, ms: 1.2,
        skill: "地震", skillDesc: "每5秒范围200伤害并眩晕"},
    "🐲": {name: "湾鳄", tier: 8, class: "刺客",
        hp: 2000, atk: 800, def: 60, spd: 1.5, range: 55, ms: 2.2,
        skill: "伏击", skillDesc: "静止时隐身，首次攻击10倍伤害"},

    // =================== TIER 9 (6000G) ===================
    "🐘": {name: "非洲象", tier: 9, class: "肉盾",
        hp: 12000, atk: 600, def: 400, spd: 0.6, range: 80, ms: 1.4,
        skill: "毁灭", skillDesc: "前方大范围双倍伤害并击退"},
    "🐋": {name: "虎鲸", tier: 9, class: "战士",
        hp: 7000, atk: 1000, def: 150, spd: 1.5, range: 80, ms: 2.4,
        skill: "召唤", skillDesc: "每5次攻击召唤2个50%属性分身（上限4只）"},
    "🦕": {name: "霸王龙", tier: 9, class: "刺客",
        hp: 5000, atk: 1600, def: 100, spd: 1.2, range: 70, ms: 2.0,
        skill: "暴君", skillDesc: "无视防御造成真实伤害"},

    // =================== TIER 10 (20000G) ===================
    "🐉": {name: "龙", tier: 10, class: "神兽",
        hp: 30000, atk: 2200, def: 500, spd: 1.5, range: 280, ms: 3.0,
        skill: "龙息", skillDesc: "持续喷射火焰，范围持续伤害"},
    "🦄": {name: "独角兽", tier: 10, class: "神兽",
        hp: 28000, atk: 1500, def: 400, spd: 2.0, range: 200, ms: 3.2,
        skill: "复活", skillDesc: "死亡满血复活，治疗全场友军"}
};

// 投射物类型配置
export const PROJECTILE_TYPES = {
    'normal': {emoji: '⚡', speed: 12},
    'fire':   {emoji: '🔥', speed: 10},
    'ice':    {emoji: '❄️', speed: 8},
    'arrow':  {emoji: '🏹', speed: 14},
    'poison': {emoji: '☠️', speed: 6}
};

// 远程单位（射程 > 200 的都走投射物）
export const RANGED_UNITS = ['蜘蛛', '蝴蝶', '蝙蝠', '虾', '孔雀', '章鱼', '鹰', '牛蛙', '龙', '虎鲸', '独角兽'];

// 技能型单位（不普攻，靠技能输出）
export const SKILL_ONLY_UNITS = ['猛犸象', '龙'];

// 分身上限
export const MAX_CLONES = 4;
export const CLONE_ATTACK_INTERVAL = 5;
export const CLONE_STAT_RATIO = 0.5;
