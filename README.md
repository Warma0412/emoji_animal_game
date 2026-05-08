# ⚔️ Emoji Battle Arena - 动物斗兽场 v2.0

> 收集动物 · 组建军团 · 策略对战

## 项目结构

```
emoji乱斗/
├── index.html          # 入口页面
├── style.css           # 样式表
├── js/
│   ├── config.js       # 动物数据库 & 常量配置
│   ├── audio.js        # Web Audio API 音效系统
│   ├── effects.js      # 粒子特效 & 伤害数字
│   ├── projectile.js   # 投射物系统
│   ├── unit.js         # 战斗单位 AI
│   ├── game.js         # 核心游戏逻辑
│   └── app.js          # 应用入口
├── server.js           # Node.js 静态服务器
├── package.json        # NPM 配置
├── Dockerfile          # Docker 容器化部署
├── nginx.conf          # Nginx 配置示例
└── README.md           # 本文件
```

## 快速开始

### 方式一：直接打开
用任意 HTTP 服务器托管本目录即可（不支持 file:// 协议，因为使用了 ES Modules）

```bash
# 使用 Python
python3 -m http.server 3000

# 或使用 Node.js
node server.js
```

然后访问 http://localhost:3000

### 方式二：Docker 部署

```bash
docker build -t emoji-battle .
docker run -p 80:80 emoji-battle
```

### 方式三：Nginx 部署

1. 将项目文件复制到服务器 `/var/www/emoji-battle/`
2. 参考 `nginx.conf` 配置 Nginx
3. 配置 SSL 证书（推荐 Let's Encrypt）

## 游戏玩法

1. **开始游戏** - 系统随机分配金币（贫穷/普通/富裕/富豪）
2. **购买动物** - 在商店中购买不同等级的动物，长按可快速购买
3. **组建军团** - 最多 100 只动物，右键可出售
4. **选择部署** - 自动部署或手动部署到战场
5. **战斗** - 60 秒内决出胜负

## v2.0 更新内容

- 🎨 模块化代码结构，易于维护和扩展
- 🔊 Web Audio API 音效系统（打击音效、技能音效、背景音乐）
- ✨ 增强粒子特效系统（击杀特效、技能特效）
- 🏃 战斗速度控制（1x / 2x / 3x）
- 📱 更好的移动端适配
- 🐛 修复重复 emoji 等已知 Bug
- 🚀 部署就绪（Docker / Nginx / Node.js）

## 技术栈

- 纯 HTML5 + CSS3 + JavaScript（ES Modules）
- Canvas 2D 渲染
- Web Audio API 音效
- 零依赖，无需构建工具
