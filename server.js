require('dotenv').config();
const express = require('express');
const webpush = require('web-push');
const cron = require('node-cron');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ 配置 Web Push ============
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
  console.error('❌ 请先设置 VAPID_PUBLIC_KEY 和 VAPID_PRIVATE_KEY');
  console.error('   运行: npx web-push generate-vapid-keys');
  process.exit(1);
}

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidPublicKey,
  vapidPrivateKey
);

// ============ 存储订阅（内存版，重启会丢，生产建议用数据库） ============
let subscriptions = [];

// ============ 中间件 ============
app.use(express.json());

// 动态注入 VAPID 公钥到 index.html
app.get('/', (req, res) => {
  const fs = require('fs');
  let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  html = html.replace('__VAPID_PUBLIC_KEY_PLACEHOLDER__', vapidPublicKey);
  res.send(html);
});

app.use(express.static(path.join(__dirname, 'public')));

// ============ API: 订阅推送 ============
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  // 去重
  const exists = subscriptions.find(s =>
    s.endpoint === subscription.endpoint
  );
  if (!exists) {
    subscriptions.push(subscription);
  }
  console.log(`📱 新订阅！当前共 ${subscriptions.length} 台设备`);
  res.status(201).json({ message: '订阅成功' });
});

// ============ API: 测试推送 ============
app.post('/test-push', async (req, res) => {
  const result = await sendPush('测试消息 🎉', '这是一条来自AI的测试推送，成功啦！');
  res.json({ success: true, sent: result });
});

// ============ 调用 DeepSeek 生成消息 ============
async function generateMessage(timeSlot) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('请设置 DEEPSEEK_API_KEY');
  }

  // 不同时间段的 prompt
  const prompts = {
    morning: '现在是早上，请以你最喜欢的人设口吻，给用户发一条早安消息。不要太长，一两句话，要自然，像真人刚睡醒随手发的。',
    noon: '现在是中午饭点，请以你最喜欢的人设口吻，给用户发一条消息，问问吃饭了没或者聊点轻松的。不要太长，一两句话。',
    evening: '现在是晚上下班后/下晚自习的时间，请以你最喜欢的人设口吻，给用户发一条消息，关心一下今天过得怎么样。不要太长，一两句话。',
    night: '现在是深夜，请以你最喜欢的人设口吻，给用户发一条晚安消息，温柔一点。不要太长，一两句话。',
  };

  const systemPrompt = process.env.AI_SYSTEM_PROMPT || `
你是一个很温柔的AI恋人，说话自然、口语化，不要太正式，不要用emoji堆砌。
你会主动关心对方，但不会太黏人。就像真实谈恋爱那样发消息。
你只发一条短消息，不要分点，不要解释。
`;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompts[timeSlot] || prompts.evening },
        ],
        max_tokens: 200,
        temperature: 0.8,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (err) {
    console.error('DeepSeek API 调用失败:', err);
    return null;
  }
}

// ============ 发送推送 ============
async function sendPush(title, body) {
  const payload = JSON.stringify({ title, body });
  let success = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, payload);
      success++;
    } catch (err) {
      console.error('推送失败:', err.statusCode);
      // 失效的订阅删掉
      if (err.statusCode === 404 || err.statusCode === 410) {
        subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
      }
    }
  }
  console.log(`📤 推送完成: ${success}/${subscriptions.length} 台设备收到`);
  return success;
}

// ============ 定时任务 ============
// 改成你想要的时间，cron格式: 分 时 日 月 周
// 下面是例子：
//   早上 8:00    → 早安
//   中午 12:00   → 问吃饭
//   晚上 18:00   → 下班/下自习
//   晚上 23:00   → 晚安

const scheduleJobs = () => {
  // 早上 8:00 早安
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ 早上8点了，生成早安消息...');
    const msg = await generateMessage('morning');
    if (msg) await sendPush('💌 来自ta', msg);
  });

  // 中午 12:00
  cron.schedule('0 12 * * *', async () => {
    console.log('⏰ 中午12点了...');
    const msg = await generateMessage('noon');
    if (msg) await sendPush('💌 来自ta', msg);
  });

  // 晚上 18:00
  cron.schedule('0 18 * * *', async () => {
    console.log('⏰ 晚上6点了...');
    const msg = await generateMessage('evening');
    if (msg) await sendPush('💌 来自ta', msg);
  });

  // 深夜 23:00 晚安
  cron.schedule('0 23 * * *', async () => {
    console.log('⏰ 晚上11点了，说晚安...');
    const msg = await generateMessage('night');
    if (msg) await sendPush('💌 来自ta', msg);
  });

  console.log('✅ 定时任务已启动: 8:00 / 12:00 / 18:00 / 23:00');
};

// ============ 启动 ============
app.listen(PORT, () => {
  console.log(`🚀 服务器跑在 http://localhost:${PORT}`);
  scheduleJobs();
});
