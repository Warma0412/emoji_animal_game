import pygame
import random
import math
from typing import List, Optional
from dataclasses import dataclass

# 初始化
pygame.init()
SCREEN_WIDTH, SCREEN_HEIGHT = 1200, 700
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Emoji Battle Arena")
clock = pygame.time.Clock()
font = pygame.font.SysFont("segoe ui emoji", 32)
small_font = pygame.font.SysFont("segoe ui emoji", 20)

# ==================== 游戏数据 ====================

TIER_PRICES = {i: 3**(i-1) for i in range(1, 11)}  # 1, 3, 9, 27...

ANIMAL_DB = {
    # 1档 1金币 - 只有前4只有技能
    "🐜": {"name": "蚂蚁", "tier": 1, "hp": 10, "atk": 2, "def": 0, "spd": 2, "range": 20, "ms": 2, "skill": None},
    "🕷️": {"name": "蜘蛛", "tier": 1, "hp": 15, "atk": 3, "def": 0, "spd": 1, "range": 40, "ms": 1.5, "skill": "减速"},
    "🐌": {"name": "蜗牛", "tier": 1, "hp": 30, "atk": 2, "def": 3, "spd": 0.3, "range": 15, "ms": 1, "skill": None},
    "🦂": {"name": "蝎子", "tier": 1, "hp": 18, "atk": 6, "def": 1, "spd": 0.8, "range": 25, "ms": 1.2, "skill": "剧毒"},
    "🦋": {"name": "蝴蝶", "tier": 1, "hp": 12, "atk": 2, "def": 0, "spd": 1.5, "range": 20, "ms": 2.5, "skill": None},
    "🐛": {"name": "毛虫", "tier": 1, "hp": 15, "atk": 3, "def": 1, "spd": 0.6, "range": 15, "ms": 1, "skill": None},
    "🦗": {"name": "蟋蟀", "tier": 1, "hp": 10, "atk": 4, "def": 0, "spd": 2.5, "range": 20, "ms": 2.2, "skill": None},
    "🦟": {"name": "蚊子", "tier": 1, "hp": 6, "atk": 2, "def": 0, "spd": 3, "range": 15, "ms": 2.8, "skill": "吸血"},
    
    # 2档 3金币
    "🐭": {"name": "老鼠", "tier": 2, "hp": 35, "atk": 5, "def": 0, "spd": 2, "range": 20, "ms": 2.5, "skill": None},
    "🐰": {"name": "兔子", "tier": 2, "hp": 40, "atk": 6, "def": 1, "spd": 2.2, "range": 25, "ms": 3, "skill": "闪避"},
    "🦔": {"name": "刺猬", "tier": 2, "hp": 45, "atk": 4, "def": 5, "spd": 1.2, "range": 20, "ms": 1.8, "skill": None},
    "🦇": {"name": "蝙蝠", "tier": 2, "hp": 25, "atk": 6, "def": 0, "spd": 3, "range": 35, "ms": 3.5, "skill": None},
    "🦦": {"name": "水獭", "tier": 2, "hp": 50, "atk": 9, "def": 2, "spd": 1.8, "range": 30, "ms": 2.2, "skill": None},
    "🦐": {"name": "虾", "tier": 2, "hp": 20, "atk": 12, "def": 0, "spd": 3.5, "range": 25, "ms": 2, "skill": "连击"},
    "🦪": {"name": "牡蛎", "tier": 2, "hp": 70, "atk": 3, "def": 8, "spd": 0.2, "range": 15, "ms": 0.5, "skill": None},
    
    # 3档 9金币
    "🐱": {"name": "家猫", "tier": 3, "hp": 60, "atk": 16, "def": 2, "spd": 2.5, "range": 25, "ms": 3, "skill": "暴击"},
    "🦊": {"name": "狐狸", "tier": 3, "hp": 55, "atk": 14, "def": 2, "spd": 2, "range": 30, "ms": 2.8, "skill": None},
    "🐷": {"name": "家猪", "tier": 3, "hp": 100, "atk": 13, "def": 6, "spd": 1, "range": 25, "ms": 2, "skill": None},
    "🦘": {"name": "袋鼠", "tier": 3, "hp": 90, "atk": 24, "def": 3, "spd": 1.8, "range": 30, "ms": 2.5, "skill": "飞踢"},
    "🦚": {"name": "孔雀", "tier": 3, "hp": 90, "atk": 18, "def": 4, "spd": 1.5, "range": 40, "ms": 2, "skill": None},
    "🐧": {"name": "企鹅", "tier": 3, "hp": 80, "atk": 20, "def": 6, "spd": 1.5, "range": 25, "ms": 2.2, "skill": None},
    "🐡": {"name": "河豚", "tier": 3, "hp": 55, "atk": 28, "def": 10, "spd": 0.8, "range": 25, "ms": 1.5, "skill": "反伤"},
    
    # 4档 27金币
    "🐶": {"name": "家犬", "tier": 4, "hp": 120, "atk": 28, "def": 8, "spd": 1.8, "range": 30, "ms": 2.8, "skill": None},
    "🐴": {"name": "马", "tier": 4, "hp": 160, "atk": 35, "def": 8, "spd": 2.5, "range": 35, "ms": 4, "skill": "冲锋"},
    "🐃": {"name": "水牛", "tier": 4, "hp": 220, "atk": 38, "def": 25, "spd": 0.8, "range": 35, "ms": 2.5, "skill": None},
    "🦭": {"name": "海狮", "tier": 4, "hp": 140, "atk": 32, "def": 10, "spd": 1.8, "range": 35, "ms": 3, "skill": None},
    "🦀": {"name": "螃蟹", "tier": 4, "hp": 120, "atk": 25, "def": 35, "spd": 1.2, "range": 25, "ms": 2, "skill": "防御"},
    "🦞": {"name": "龙虾", "tier": 4, "hp": 140, "atk": 45, "def": 28, "spd": 1, "range": 35, "ms": 2.2, "skill": None},
    "🐙": {"name": "章鱼", "tier": 4, "hp": 130, "atk": 22, "def": 8, "spd": 1.5, "range": 60, "ms": 2.5, "skill": "缠绕"},
    
    # 5档 81金币 - 全部有技能（分水岭）
    "🐗": {"name": "野猪", "tier": 5, "hp": 240, "atk": 60, "def": 15, "spd": 1.5, "range": 35, "ms": 3, "skill": "狂暴"},
    "🦬": {"name": "野牛", "tier": 5, "hp": 300, "atk": 55, "def": 40, "spd": 1, "range": 40, "ms": 3.2, "skill": "践踏"},
    "🦅": {"name": "鹰", "tier": 5, "hp": 170, "atk": 90, "def": 4, "spd": 3, "range": 80, "ms": 5, "skill": "高空"},
    "🐍": {"name": "蛇", "tier": 5, "hp": 190, "atk": 60, "def": 10, "spd": 3.2, "range": 30, "ms": 3, "skill": "剧毒"},
    "🐢": {"name": "陆龟", "tier": 5, "hp": 380, "atk": 28, "def": 85, "spd": 0.5, "range": 20, "ms": 1.2, "skill": "无敌"},
    "🦎": {"name": "蜥蜴", "tier": 5, "hp": 210, "atk": 65, "def": 15, "spd": 2, "range": 35, "ms": 3.2, "skill": "再生"},
    "🐸": {"name": "牛蛙", "tier": 5, "hp": 200, "atk": 55, "def": 12, "spd": 2.8, "range": 50, "ms": 3, "skill": "长舌"},
    
    # 6-10档（全部有技能，数值爆炸）
    "🐺": {"name": "狼", "tier": 6, "hp": 280, "atk": 85, "def": 20, "spd": 2.5, "range": 30, "ms": 3.5, "skill": "狼群"},
    "🐻": {"name": "黑熊", "tier": 6, "hp": 350, "atk": 120, "def": 40, "spd": 1.5, "range": 40, "ms": 2.8, "skill": "暴击"},
    "🐊": {"name": "鳄鱼", "tier": 6, "hp": 330, "atk": 115, "def": 40, "spd": 1.2, "range": 40, "ms": 3, "skill": "翻滚"},
    "🦈": {"name": "鲨鱼", "tier": 6, "hp": 320, "atk": 140, "def": 15, "spd": 2.3, "range": 40, "ms": 4, "skill": "血怒"},
    
    "🦁": {"name": "狮子", "tier": 7, "hp": 480, "atk": 170, "def": 45, "spd": 2.2, "range": 40, "ms": 3.5, "skill": "威吓"},
    "🐅": {"name": "豹子", "tier": 7, "hp": 380, "atk": 190, "def": 25, "spd": 3.2, "range": 40, "ms": 4.5, "skill": "潜行"},
    "🦏": {"name": "犀牛", "tier": 7, "hp": 620, "atk": 210, "def": 80, "spd": 1.2, "range": 45, "ms": 4, "skill": "冲撞"},
    "🦛": {"name": "河马", "tier": 7, "hp": 680, "atk": 150, "def": 65, "spd": 1.3, "range": 40, "ms": 3.2, "skill": "吞噬"},
    
    "🐯": {"name": "成年虎", "tier": 8, "hp": 650, "atk": 260, "def": 50, "spd": 2.5, "range": 50, "ms": 4, "skill": "处决"},
    "🐻‍❄️": {"name": "北极熊", "tier": 8, "hp": 680, "atk": 230, "def": 80, "spd": 1.8, "range": 50, "ms": 3.5, "skill": "冰封"},
    "🦣": {"name": "猛犸象", "tier": 8, "hp": 1200, "atk": 200, "def": 100, "spd": 0.6, "range": 60, "ms": 2.8, "skill": "地震"},
    "🐊": {"name": "湾鳄", "tier": 8, "hp": 750, "atk": 320, "def": 60, "spd": 1.8, "range": 50, "ms": 3.8, "skill": "伏击"},
    
    "🐘": {"name": "非洲象", "tier": 9, "hp": 2000, "atk": 360, "def": 160, "spd": 0.6, "range": 70, "ms": 3, "skill": "毁灭"},
    "🐋": {"name": "虎鲸", "tier": 9, "hp": 1800, "atk": 460, "def": 85, "spd": 1.8, "range": 60, "ms": 4, "skill": "召唤"},
    "🦕": {"name": "霸王龙", "tier": 9, "hp": 1600, "atk": 520, "def": 100, "spd": 1, "range": 60, "ms": 3.5, "skill": "暴君"},
    
    "🐉": {"name": "龙", "tier": 10, "hp": 5500, "atk": 850, "def": 250, "spd": 1.2, "range": 120, "ms": 5, "skill": "龙息"},
    "🦄": {"name": "独角兽", "tier": 10, "hp": 4500, "atk": 520, "def": 180, "spd": 2.2, "range": 90, "ms": 6, "skill": "复活"},
}

# 技能说明（极简）
SKILL_DESC = {
    "减速": "降低目标50%攻速",
    "剧毒": "每秒损失5HP(5秒)",
    "吸血": "造成伤害的50%转为生命",
    "闪避": "30%概率闪避攻击",
    "连击": "攻击2次",
    "反伤": "反弹50%近战伤害",
    "暴击": "30%概率造成3倍伤害",
    "飞踢": "每3次攻击暴击(3倍)",
    "防御": "额外+50%防御",
    "缠绕": "定身目标2秒",
    "狂暴": "生命<50%时攻速翻倍",
    "践踏": "范围50伤害",
    "高空": "免疫近战攻击",
    "无敌": "3秒无敌(CD10秒)",
    "再生": "每秒恢复10HP",
    "长舌": "抓取远处敌人",
    "狼群": "周围有狼时伤害+50%",
    "血怒": "攻击残血伤害翻倍",
    "威吓": "周围敌人攻击-30%",
    "潜行": "前3秒隐身且暴击",
    "冲撞": "路径上敌人受到伤害",
    "吞噬": "秒杀血量<20%的敌人",
    "处决": "对<25%血量敌人秒杀",
    "冰封": "冻结敌人3秒",
    "地震": "范围100伤害+眩晕",
    "伏击": "首次攻击5倍伤害",
    "毁灭": "前方敌人受到双倍伤害",
    "召唤": "召唤幻影(50%属性)",
    "暴君": "无视防御",
    "龙息": "范围持续伤害",
    "复活": "死亡时满血复活一次"
}

# ==================== 游戏类 ====================

@dataclass
class Unit:
    emoji: str
    team: str  # "left" or "right"
    x: float
    y: float
    max_hp: int
    hp: int
    atk: int
    defense: int
    atk_spd: float
    range: int
    move_speed: float
    skill: Optional[str]
    name: str
    
    def __post_init__(self):
        self.last_attack = 0
        self.direction = 1 if self.team == "left" else -1
        self.target: Optional[Unit] = None
        self.alive = True
        self.effects = {}  # 简单状态
        self.skill_cooldown = 0
        
    def update(self, dt, enemies: List['Unit']):
        if not self.alive:
            return
            
        # 寻找目标
        self.target = None
        min_dist = float('inf')
        for e in enemies:
            if e.alive:
                dist = abs(e.x - self.x)
                if dist < min_dist:
                    min_dist = dist
                    self.target = e
        
        # 移动或攻击
        if self.target:
            dist = abs(self.target.x - self.x)
            if dist > self.range:
                # 移动
                self.x += self.move_speed * self.direction * dt * 60
            else:
                # 攻击
                self.last_attack += dt
                atk_interval = 1.0 / self.atk_spd
                if self.last_attack >= atk_interval:
                    self.last_attack = 0
                    self.attack(self.target)
                    
        # 技能冷却
        if self.skill_cooldown > 0:
            self.skill_cooldown -= dt
            
        # 特效更新（毒、减速等）
        if "poison" in self.effects:
            self.hp -= self.effects["poison"] * dt
            if self.hp <= 0:
                self.alive = False
                
    def attack(self, target: 'Unit'):
        dmg = max(1, self.atk - target.defense * 0.5)
        
        # 技能处理（极简）
        if self.skill == "暴击" and random.random() < 0.3:
            dmg *= 3
        elif self.skill == "连击":
            dmg *= 2
        elif self.skill == "吸血":
            self.hp = min(self.max_hp, self.hp + dmg * 0.5)
        elif self.skill == "减速":
            target.effects["slow"] = 3  # 3秒
        elif self.skill == "剧毒":
            target.effects["poison"] = 5  # 每秒5伤害
        elif self.skill == "闪避" and random.random() < 0.3:
            return  # 闪避了，不造成伤害
            
        target.take_damage(dmg, self)
        
    def take_damage(self, dmg: float, attacker: 'Unit'):
        # 闪避检查
        if self.skill == "闪避" and random.random() < 0.3:
            return
            
        # 反伤
        if self.skill == "反伤" andabs(attacker.x - self.x) < 50:
            attacker.hp -= dmg * 0.5
            
        self.hp -= dmg
        if self.hp <= 0:
            self.alive = False
            
    def draw(self, surf):
        if not self.alive:
            return
        # 绘制Emoji
        text = font.render(self.emoji, True, (255, 255, 255))
        text_rect = text.get_rect(center=(int(self.x), int(self.y)))
        surf.blit(text, text_rect)
        
        # 血条
        bar_w = 40
        bar_h = 5
        hp_pct = self.hp / self.max_hp
        pygame.draw.rect(surf, (255, 0, 0), (self.x - bar_w//2, self.y - 30, bar_w, bar_h))
        pygame.draw.rect(surf, (0, 255, 0), (self.x - bar_w//2, self.y - 30, int(bar_w * hp_pct), bar_h))

class Game:
    def __init__(self):
        self.state = "menu"  # menu, shop, battle, result
        self.money = 0
        self.army: List[str] = []  # emoji列表
        self.units: List[Unit] = []
        self.enemy_units: List[Unit] = []
        self.battle_timer = 0
        self.result_message = ""
        self.scroll_offset = 0
        
    def start_game(self):
        # 随机初始资金
        roll = random.random()
        if roll < 0.3:
            self.money = random.randint(50, 200)  # 贫穷
            self.money_tier = "贫穷"
        elif roll < 0.6:
            self.money = random.randint(300, 1000)  # 普通
            self.money_tier = "普通"
        elif roll < 0.9:
            self.money = random.randint(1500, 8000)  # 富裕
            self.money_tier = "富裕"
        else:
            self.money = random.randint(15000, 25000)  # 富豪
            self.money_tier = "富豪"
        self.army = []
        self.state = "shop"
        
    def buy(self, emoji: str):
        if len(self.army) >= 100:
            return False
        price = TIER_PRICES[ANIMAL_DB[emoji]["tier"]]
        if self.money >= price:
            self.money -= price
            self.army.append(emoji)
            return True
        return False
        
    def sell(self, index: int):
        if 0 <= index < len(self.army):
            emoji = self.army.pop(index)
            price = TIER_PRICES[ANIMAL_DB[emoji]["tier"]]
            self.money += price // 2  # 半价回收
            
    def start_battle(self):
        if not self.army:
            return
            
        self.state = "battle"
        self.units = []
        self.enemy_units = []
        
        # 创建我方单位（从左侧出发）
        total_value = sum(TIER_PRICES[ANIMAL_DB[e]["tier"]] for e in self.army)
        y_positions = [150 + (i % 5) * 100 for i in range(len(self.army))]
        for i, emoji in enumerate(self.army):
            data = ANIMAL_DB[emoji]
            y = y_positions[i] if i < len(y_positions) else random.randint(100, 600)
            unit = Unit(
                emoji=emoji, team="left", x=50, y=y,
                max_hp=data["hp"], hp=data["hp"],
                atk=data["atk"], defense=data["def"],
                atk_spd=data["spd"], range=data["range"],
                move_speed=data["ms"], skill=data["skill"],
                name=data["name"]
            )
            self.units.append(unit)
            
        # 创建敌方单位（总金额相近，±20%）
        enemy_budget = int(total_value * random.uniform(0.8, 1.2))
        enemy_army = []
        current_cost = 0
        
        while current_cost < enemy_budget and len(enemy_army) < 100:
            # 随机选择动物，倾向选择玩家拥有的档位
            available = list(ANIMAL_DB.keys())
            choice = random.choice(available)
            cost = TIER_PRICES[ANIMAL_DB[choice]["tier"]]
            if current_cost + cost <= enemy_budget:
                enemy_army.append(choice)
                current_cost += cost
                
        y_positions_e = [150 + (i % 5) * 100 for i in range(len(enemy_army))]
        for i, emoji in enumerate(enemy_army):
            data = ANIMAL_DB[emoji]
            y = y_positions_e[i] if i < len(y_positions_e) else random.randint(100, 600)
            unit = Unit(
                emoji=emoji, team="right", x=SCREEN_WIDTH-50, y=y,
                max_hp=data["hp"], hp=data["hp"],
                atk=data["atk"], defense=data["def"],
                atk_spd=data["spd"], range=data["range"],
                move_speed=data["ms"], skill=data["skill"],
                name=data["name"]
            )
            self.enemy_units.append(unit)
            
    def update(self, dt):
        if self.state == "battle":
            # 更新单位
            for u in self.units:
                u.update(dt, self.enemy_units)
            for u in self.enemy_units:
                u.update(dt, self.units)
                
            # 检查结束
            left_alive = sum(1 for u in self.units if u.alive)
            right_alive = sum(1 for u in self.enemy_units if u.alive)
            
            if left_alive == 0 or right_alive == 0:
                self.state = "result"
                if left_alive > 0:
                    self.result_message = f"胜利! 剩余{left_alive}只"
                    reward = sum(TIER_PRICES[ANIMAL_DB[e]["tier"]] for e in self.army) // 10
                    self.money += reward
                elif right_alive > 0:
                    self.result_message = f"失败... 敌方剩余{right_alive}只"
                else:
                    self.result_message = "平局!"
                    
    def draw(self, surf):
        surf.fill((240, 240, 245))
        
        if self.state == "menu":
            self.draw_menu(surf)
        elif self.state == "shop":
            self.draw_shop(surf)
        elif self.state == "battle":
            self.draw_battle(surf)
        elif self.state == "result":
            self.draw_result(surf)
            
    def draw_menu(self, surf):
        title = font.render("Emoji Battle Arena", True, (50, 50, 50))
        surf.blit(title, (SCREEN_WIDTH//2 - title.get_width()//2, 200))
        
        start_btn = pygame.Rect(SCREEN_WIDTH//2 - 100, 350, 200, 60)
        pygame.draw.rect(surf, (100, 149, 237), start_btn, border_radius=10)
        text = font.render("开始新游戏", True, (255, 255, 255))
        surf.blit(text, (start_btn.centerx - text.get_width()//2, start_btn.centery - text.get_height()//2))
        
        mouse_pos = pygame.mouse.get_pos()
        if start_btn.collidepoint(mouse_pos):
            pygame.draw.rect(surf, (255, 182, 193), start_btn, 3, border_radius=10)
            
    def draw_shop(self, surf):
        # 顶部信息栏
        info = small_font.render(f"资金: {self.money} | 兵力: {len(self.army)}/100 | 开局: {self.money_tier}", True, (50, 50, 50))
        surf.blit(info, (20, 20))
        
        # 按钮
        battle_btn = pygame.Rect(SCREEN_WIDTH - 150, 10, 130, 40)
        pygame.draw.rect(surf, (255, 105, 180), battle_btn, border_radius=5)
        battle_text = small_font.render("开始战斗", True, (255, 255, 255))
        surf.blit(battle_text, (battle_btn.centerx - battle_text.get_width()//2, battle_btn.centery - battle_text.get_height()//2))
        
        # 动物列表（可滚动）
        start_y = 80
        x = 50
        for emoji, data in list(ANIMAL_DB.items())[self.scroll_offset:self.scroll_offset+40]:
            price = TIER_PRICES[data["tier"]]
            color = (200, 200, 200) if self.money < price else (173, 216, 230)
            rect = pygame.Rect(x, start_y, 120, 80)
            pygame.draw.rect(surf, color, rect, border_radius=5)
            
            emoji_text = font.render(emoji, True, (0, 0, 0))
            surf.blit(emoji_text, (x + 10, start_y + 5))
            
            name_text = small_font.render(data["name"], True, (0, 0, 0))
            surf.blit(name_text, (x + 40, start_y + 10))
            
            price_text = small_font.render(f"{price}G", True, (255, 0, 0) if self.money < price else (0, 128, 0))
            surf.blit(price_text, (x + 40, start_y + 35))
            
            if data["skill"]:
                skill_text = small_font.render(data["skill"], True, (128, 0, 128))
                surf.blit(skill_text, (x + 5, start_y + 60))
            
            x += 130
            if x > SCREEN_WIDTH - 130:
                x = 50
                start_y += 90
                
        # 当前队伍（底部）
        pygame.draw.rect(surf, (255, 228, 225), (0, 550, SCREEN_WIDTH, 150))
        army_text = small_font.render("当前队伍 (点击移除):", True, (0, 0, 0))
        surf.blit(army_text, (20, 560))
        
        x = 20
        for i, emoji in enumerate(self.army[:50]):  # 只显示前50个
            rect = pygame.Rect(x, 590, 40, 40)
            pygame.draw.rect(surf, (255, 255, 255), rect, border_radius=3)
            text = small_font.render(emoji, True, (0, 0, 0))
            surf.blit(text, (rect.centerx - text.get_width()//2, rect.centery - text.get_height()//2))
            x += 45
            if x > SCREEN_WIDTH - 50:
                x = 20
                
    def draw_battle(self, surf):
        # 战场背景
        pygame.draw.line(surf, (200, 200, 200), (SCREEN_WIDTH//2, 100), (SCREEN_WIDTH//2, 600), 2)
        
        # 绘制单位
        for u in self.units:
            u.draw(surf)
        for u in self.enemy_units:
            u.draw(surf)
            
        # 统计
        left = sum(1 for u in self.units if u.alive)
        right = sum(1 for u in self.enemy_units if u.alive)
        stats = font.render(f"{left} vs {right}", True, (0, 0, 0))
        surf.blit(stats, (SCREEN_WIDTH//2 - stats.get_width()//2, 20))
        
    def draw_result(self, surf):
        text = font.render(self.result_message, True, (50, 50, 50))
        surf.blit(text, (SCREEN_WIDTH//2 - text.get_width()//2, 300))
        
        btn = pygame.Rect(SCREEN_WIDTH//2 - 100, 400, 200, 50)
        pygame.draw.rect(surf, (100, 149, 237), btn, border_radius=10)
        btn_text = font.render("返回商店", True, (255, 255, 255))
        surf.blit(btn_text, (btn.centerx - btn_text.get_width()//2, btn.centery - btn_text.get_height()//2))

def main():
    game = Game()
    running = True
    
    while running:
        dt = clock.tick(60) / 1000.0
        
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
                
            elif event.type == pygame.MOUSEBUTTONDOWN:
                pos = event.pos
                if game.state == "menu":
                    if pygame.Rect(SCREEN_WIDTH//2 - 100, 350, 200, 60).collidepoint(pos):
                        game.start_game()
                elif game.state == "shop":
                    # 检查购买
                    x, y = 50, 80
                    for emoji in list(ANIMAL_DB.keys())[game.scroll_offset:game.scroll_offset+40]:
                        rect = pygame.Rect(x, y, 120, 80)
                        if rect.collidepoint(pos):
                            game.buy(emoji)
                            break
                        x += 130
                        if x > SCREEN_WIDTH - 130:
                            x = 50
                            y += 90
                    
                    # 检查移除
                    x = 20
                    for i in range(min(len(game.army), 50)):
                        rect = pygame.Rect(x, 590, 40, 40)
                        if rect.collidepoint(pos):
                            game.sell(i)
                            break
                        x += 45
                        if x > SCREEN_WIDTH - 50:
                            x = 20
                    
                    # 开始战斗按钮
                    if pygame.Rect(SCREEN_WIDTH - 150, 10, 130, 40).collidepoint(pos):
                        game.start_battle()
                        
                    # 滚动
                    if event.button == 4:  # 滚轮上
                        game.scroll_offset = max(0, game.scroll_offset - 5)
                    elif event.button == 5:  # 滚轮下
                        game.scroll_offset = min(len(ANIMAL_DB) - 40, game.scroll_offset + 5)
                        
                elif game.state == "result":
                    if pygame.Rect(SCREEN_WIDTH//2 - 100, 400, 200, 50).collidepoint(pos):
                        game.state = "shop"
                        game.army = []  # 清空重新配置
                        
        game.update(dt)
        game.draw(screen)
        pygame.display.flip()
        
    pygame.quit()

if __name__ == "__main__":
    main()
