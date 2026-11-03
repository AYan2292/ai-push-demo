const webpush = require('web-push');
const { kv } = require('@vercel/kv');

// 配置 web-push
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// 保存订阅
async function saveSubscription(subscription) {
  const key = 'sub:' + subscription.endpoint;
  await kv.set(key, subscription);
}

// 获取所有订阅
async function getAllSubscriptions() {
  const keys = await kv.keys('sub:*');
  if (keys.length === 0) return [];
  return await kv.mget(...keys);
}

// 删除失效订阅
async function removeSubscription(endpoint) {
  await kv.del('sub:' + endpoint);
}

// 发送推送
async function sendPush(title, body) {
  const subscriptions = await getAllSubscriptions();
  let success = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, JSON.stringify({ title, body }));
      success++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await removeSubscription(sub.endpoint);
      }
    }
  }
  return success;
}

// 调用 DeepSeek 生成消息
async function generateMessage(timeSlot) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

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
    console.error('DeepSeek error:', err);
    return null;
  }
}

module.exports = {
  saveSubscription,
  sendPush,
  generateMessage,
};
