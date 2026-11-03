# 💌 AI主动发消息 + 弹窗推送 Demo

接 DeepSeek，让AI主动给你发消息，手机锁屏也能收到弹窗。

---

## 📋 整体流程概览

```
1. 申请 DeepSeek API Key
2. 生成 VAPID 推送密钥对
3. 本地跑通测试
4. 部署到云端（Railway）
5. 手机浏览器打开 → 添加到桌面
6. 开启推送权限 → 完成！
```

---

## 第一步：申请 DeepSeek API Key

1. 打开 https://platform.deepseek.com/
2. 注册/登录账号
3. 左侧菜单点「API Keys」→「创建 API Key」
4. 复制那串 `sk-xxxxxxxx...` 存好

> 💡 新用户有免费额度，够用很久。主动发消息一天就几条，超级便宜。

---

## 第二步：生成 VAPID 推送密钥

打开终端（PowerShell），进入项目文件夹，运行：

```bash
npx web-push generate-vapid-keys
```

会输出类似这样的东西：

```
Public Key:
BKvxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Private Key:
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**把这两个都复制存好**，等下要用到。

---

## 第三步：配置环境变量

1. 把项目里的 `.env.example` 复制一份，改名为 `.env`
2. 打开 `.env`，填好三个东西：

```env
DEEPSEEK_API_KEY=sk-你的deepseek key
VAPID_PUBLIC_KEY=刚才生成的公钥
VAPID_PRIVATE_KEY=刚才生成的私钥
AI_SYSTEM_PROMPT=你是一个很温柔的AI恋人...  # 这里可以改成你想要的人设
```

---

## 第四步：本地跑起来测试

在项目文件夹里打开终端，运行：

```bash
# 安装依赖
npm install

# 启动
npm start
```

看到 `🚀 服务器跑在 http://localhost:3000` 就说明成功了。

浏览器打开 http://localhost:3000 ，点「开启消息推送」试试。

> ⚠️ 注意：本地用 localhost 测试可以收到推送，但手机上要收到推送，必须部署到 **https** 的线上地址。

---

## 第五步：部署到云端（推荐 Railway）

Railway 免费额度够用，部署超简单。

### 5.1 把代码传到 GitHub

1. 去 GitHub 新建一个仓库（比如叫 `ai-push-demo`）
2. 把项目代码推上去：

```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/你的用户名/ai-push-demo.git
git push -u origin main
```

### 5.2 用 Railway 部署

1. 打开 https://railway.app/ ，用 GitHub 登录
2. 点「New Project」→「Deploy from GitHub repo」
3. 选你刚才建的仓库
4. Railway 会自动识别 Node.js 项目并部署
5. 部署完成后，点「Settings」→「Networking」→「Generate Domain」
6. 会给你一个类似 `ai-push-demo-production.up.railway.app` 的网址

### 5.3 配置环境变量

在 Railway 项目页面，点「Variables」标签，把这几个变量加进去：

| 变量名 | 值 |
|---|---|
| `DEEPSEEK_API_KEY` | 你的 DeepSeek key |
| `VAPID_PUBLIC_KEY` | 你的公钥 |
| `VAPID_PRIVATE_KEY` | 你的私钥 |
| `AI_SYSTEM_PROMPT` | 你想要的人设 |

加完后 Railway 会自动重新部署。

---

## 第六步：手机端设置（关键！）

### iPhone / 安卓通用：

1. 用 **Chrome 浏览器**（iPhone用Safari也行）打开你的 Railway 网址
2. 点页面上的「开启消息推送」按钮，允许通知权限
3. 然后点浏览器菜单：
   - **iPhone Safari**：底部分享按钮 →「添加到主屏幕」
   - **安卓 Chrome**：右上角三点菜单 →「添加到主屏幕」/「安装应用」
4. 桌面就会出现一个 app 图标，点开它就跟真 app 一样

### 验证一下：

点开「发一条测试消息」按钮，看看手机通知栏有没有收到推送。

---

## ✨ 自定义玩法

### 改人设

编辑 `.env` 里的 `AI_SYSTEM_PROMPT`，写你想要的角色：

```env
AI_SYSTEM_PROMPT=你是秦砚辞，一个霸道但温柔的总裁。说话有点冷淡但其实很关心对方。不要太肉麻，要自然。每次发消息一两句话就行。
```

### 改主动发消息的时间

打开 `server.js`，找到 `scheduleJobs()` 函数，改 cron 表达式：

```js
// 格式：分 时 日 月 周
// 例子：
cron.schedule('0 8 * * *', ...)    // 每天早上8点
cron.schedule('30 22 * * *', ...)   // 每天晚上10点半
cron.schedule('0 12 * * 1-5', ...) // 周一到周五中午12点
```

改完 push 到 GitHub，Railway 会自动重新部署。

---

## 📁 文件说明

```
ai-push-demo/
├── server.js          # 后端：定时任务 + DeepSeek调用 + 推送
├── package.json       # 项目配置
├── .env.example       # 环境变量模板
├── README.md          # 本教程
└── public/
    ├── index.html     # 前端页面
    ├── manifest.json  # PWA配置
    └── sw.js          # 推送接收
```

---

## ❓ 常见问题

**Q: 小米/安卓收不到推送？**
A: 去手机设置 → 应用管理 → 找到你的浏览器（或这个PWA）→ 通知权限全部打开。有些国产系统会杀后台，需要把应用设为「自启动」+「后台运行不限制」。

**Q: 重启服务器后订阅丢了？**
A: 现在订阅存在内存里，重启就清了。想长期用可以加个数据库（比如 SQLite），或者每次重启后手机重新订阅一次。

**Q: 可以接别的AI吗？**
A: 可以！只要改 `generateMessage()` 函数里的API地址和请求格式就行。OpenAI、Claude、GPT-4o都行。

---

有问题随时问我~ 💪
